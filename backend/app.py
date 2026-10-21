import json
import math
import os
import sqlite3
from contextlib import contextmanager
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, Header, HTTPException, Request, Response
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, ConfigDict

from backend import assistance, identity
from backend.domain import (
    add_lot,
    baseline_forecast,
    event,
    expire_orders,
    find,
    import_csv,
    now,
    public_state,
    seed,
    uid,
    validate_number,
)
from backend.services import forecast, market_quotes, modes, propose_price

app = FastAPI(title="HarvestLink", version="0.1.0")
DB = Path(os.getenv("HARVESTLINK_DB", "var/harvestlink.sqlite3"))


class Payload(BaseModel):
    model_config = ConfigDict(extra="allow")


def actor_id(x_actor: Annotated[str, Header()] = "farmer"):
    if x_actor not in ("farmer", "r1", "r2", "r3"):
        raise HTTPException(403, "Unknown demo workspace")
    return x_actor


def ensure_db():
    DB.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB) as db:
        db.execute(
            "CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, revision INTEGER NOT NULL, body TEXT NOT NULL)"
        )
        if not db.execute("SELECT 1 FROM state").fetchone():
            s = seed()
            for actor in ("r1", "r2", "r3"):
                s["forecasts"][actor] = baseline_forecast(s, actor)
                s["requirements"].append(
                    {
                        "id": uid("req"),
                        "actor": actor,
                        "lot_id": "lot_tomato",
                        "quantity": s["policies"][actor]["quantity"],
                        "approved": True,
                    }
                )
            db.execute("INSERT OR IGNORE INTO state VALUES (1,0,?)", (json.dumps(s),))


@contextmanager
def transaction():
    ensure_db()
    db = sqlite3.connect(DB, timeout=10)
    try:
        db.execute("BEGIN IMMEDIATE")
        revision, body = db.execute("SELECT revision,body FROM state WHERE id=1").fetchone()
        s = json.loads(body)
        expire_orders(s)
        yield s
        db.execute(
            "UPDATE state SET revision=?,body=? WHERE id=1",
            (revision + 1, json.dumps(s)),
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def read():
    ensure_db()
    with sqlite3.connect(DB) as db:
        revision, body = db.execute("SELECT revision,body FROM state WHERE id=1").fetchone()
    return revision, json.loads(body)


def guard(actor, expected):
    if actor != expected:
        raise HTTPException(403, "This action belongs to the other workspace")


@app.exception_handler(ValueError)
async def invalid(request, exc):
    from fastapi.responses import JSONResponse

    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.get("/api/health")
def health():
    return {"status": "ok", "mode": modes()}


@app.get("/api/state")
def state(x_actor: str = Header(default="farmer")):
    actor = actor_id(x_actor)
    with transaction() as s:
        return public_state(s, actor, modes())


@app.post("/api/reset")
def reset(x_actor: str = Header(default="farmer")):
    guard(actor_id(x_actor), "farmer")
    with transaction() as s:
        fresh = seed()
        for actor in ("r1", "r2", "r3"):
            fresh["forecasts"][actor] = baseline_forecast(fresh, actor)
            fresh["requirements"].append(
                {
                    "id": uid("req"),
                    "actor": actor,
                    "lot_id": "lot_tomato",
                    "quantity": fresh["policies"][actor]["quantity"],
                    "approved": True,
                }
            )
        s.clear()
        s.update(fresh)
    return {"ok": True}


@app.post("/api/profile")
def profile(body: Payload, x_actor: str = Header(default="farmer")):
    actor = actor_id(x_actor)
    data = body.model_dump()
    with transaction() as s:
        p = find(s["profiles"], actor)
        for key in ("name", "location"):
            if key in data:
                value = str(data[key]).strip()
                if not value or len(value) > 100:
                    raise ValueError(f"{key} must be 1–100 characters")
                p[key] = value
        event(s, "Profile updated.", actor)
    return {"ok": True}


@app.post("/api/policy")
def policy(body: Payload, x_actor: str = Header(default="farmer")):
    actor = actor_id(x_actor)
    data = body.model_dump()
    allowed = (
        {"min_price", "quantity", "radius_km"}
        if actor == "farmer"
        else {"max_price", "max_budget", "quantity", "radius_km"}
    )
    if set(data) - allowed:
        raise ValueError("Policy contains unsupported fields for this role")
    with transaction() as s:
        for key, value in data.items():
            s["policies"][actor][key] = validate_number(value, key, 0.01)
        # Provisional offers do not survive a policy change. Confirmed orders retain agreed terms.
        for o in s["offers"]:
            if o["status"] == "active" and (actor == "farmer" or o["buyer"] == actor):
                o["status"] = "superseded"
        event(
            s,
            "Private negotiation policy saved. Existing provisional offers invalidated.",
            actor,
        )
    return {"ok": True}


@app.post("/api/lots")
def lots(body: Payload, x_actor: str = Header(default="farmer")):
    guard(actor_id(x_actor), "farmer")
    with transaction() as s:
        lot = add_lot(s, body.model_dump())
        event(s, f"Listed {lot['quantity']} kg {lot['crop']}.")
    return lot


@app.post("/api/import/{kind}")
def upload(kind: str, body: Payload, x_actor: str = Header(default="farmer")):
    actor = actor_id(x_actor)
    if kind not in ("harvest", "inventory", "consumption"):
        raise HTTPException(404, "Unknown CSV type")
    raw = body.model_dump().get("csv")
    if not isinstance(raw, str):
        raise ValueError("csv must be text")
    with transaction() as s:
        replace = body.model_dump().get("replace", False)
        if not isinstance(replace, bool):
            raise ValueError("replace must be true or false")
        if replace:
            if kind == "harvest":
                raise ValueError(
                    "Harvest replacement is not allowed; active trade records must remain intact"
                )
            key = "history" if kind == "consumption" else "inventory"
            s[key] = [row for row in s[key] if row["actor"] != actor]
        count = import_csv(s, actor, kind, raw)
    return {"imported": count}


@app.get("/api/templates/{kind}.csv")
def template(kind: str):
    today = date.today()
    samples = {
        "harvest": f"crop,variety,grade,quantity,unit,ask_price,harvest_date,available_date\nTomato,Local,A,100,kg,30,{today},{today}\n",
        "inventory": f"crop,quantity,unit,usable_until\nTomato,20,kg,{today + timedelta(days=3)}\n",
        "consumption": "date,crop,quantity,waste,stockout\n"
        + "\n".join(
            f"{today - timedelta(days=100 - i)},Tomato,{8 + i % 3},0,false" for i in range(7)
        )
        + "\n",
    }
    if kind not in samples:
        raise HTTPException(404, "Unknown template")
    return PlainTextResponse(
        samples[kind],
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{kind}.csv"'},
    )


@app.post("/api/forecast")
def run_forecast(x_actor: str = Header(default="farmer")):
    actor = actor_id(x_actor)
    if actor == "farmer":
        raise HTTPException(403, "Forecasts belong to restaurant workspaces")
    _, snap = read()
    result = forecast(snap, actor)
    with transaction() as s:
        for key in ("inventory", "history", "orders"):
            if s[key] != snap[key]:
                raise HTTPException(409, "Inventory changed during forecasting; run again")
        s["forecasts"][actor] = result
        event(
            s,
            "Consumption forecast and expiry-aware purchasing recommendation updated.",
            actor,
        )
    return result


@app.post("/api/requirements")
def requirement(body: Payload, x_actor: str = Header(default="farmer")):
    actor = actor_id(x_actor)
    if actor == "farmer":
        raise HTTPException(403, "Purchase requests belong to restaurants")
    data = body.model_dump()
    quantity = validate_number(data.get("quantity"), "Quantity", 0.01)
    with transaction() as s:
        lot = find(s["lots"], data.get("lot_id"))
        s["requirements"] = [
            r for r in s["requirements"] if not (r["actor"] == actor and r["lot_id"] == lot["id"])
        ]
        req = {
            "id": uid("req"),
            "actor": actor,
            "lot_id": lot["id"],
            "quantity": quantity,
            "approved": True,
        }
        s["requirements"].append(req)
        for offer in s["offers"]:
            if (
                offer["buyer"] == actor
                and offer["lot_id"] == lot["id"]
                and offer["status"] == "active"
            ):
                offer["status"] = "superseded"
        event(s, f"Approved purchase request for {quantity} kg {lot['crop']}.", actor)
    return req


@app.post("/api/negotiate")
def negotiate(body: Payload, x_actor: str = Header(default="farmer")):
    actor = actor_id(x_actor)
    data = body.model_dump()
    _, snap = read()
    lot = find(snap["lots"], data.get("lot_id"))
    seller = snap["policies"]["farmer"]
    available = lot["quantity"] - lot["reserved"] - lot["sold"]
    if available <= 0:
        raise ValueError("No unreserved harvest remains")
    if lot["available_date"] > date.today().isoformat():
        raise ValueError("Harvest is not available yet")
    requests = [
        r
        for r in snap["requirements"]
        if r["lot_id"] == lot["id"] and (actor == "farmer" or r["actor"] == actor)
    ]
    if not requests:
        raise ValueError("Approve a restaurant purchase requirement first")
    offers = []
    excluded = []
    for req in requests:
        buyer = req["actor"]
        bp = snap["policies"][buyer]
        profile = find(snap["profiles"], buyer)
        qty = min(req["quantity"], available, bp["quantity"])
        if qty < seller["quantity"] or profile["distance_km"] > min(
            seller["radius_km"], bp["radius_km"]
        ):
            excluded.append((buyer, "Quantity or service radius does not match."))
            continue
        cap = min(bp["max_price"], bp["max_budget"] / qty)
        # Public opening offer stays within buyer cap. The seller sees the offer, not the cap.
        opening = math.floor(min(cap, lot["ask_price"], bp["max_price"] * 0.85) * 100) / 100
        rounds = []
        agreed = None
        for n in range(1, 4):
            rounds.append(
                {
                    "round": n,
                    "speaker": profile["name"],
                    "price": opening,
                    "message": f"Offer for {qty:g} kg, buyer collection.",
                }
            )
            seller_price = propose_price("farmer", seller, opening, lot["ask_price"], qty)
            if not math.isfinite(seller_price) or seller_price < seller["min_price"]:
                raise ValueError("Seller agent exceeded its authorized price boundary")
            rounds.append(
                {
                    "round": n,
                    "speaker": "Farmer agent",
                    "price": seller_price,
                    "message": "Counteroffer; final buyer choice remains with the farmer.",
                }
            )
            buyer_price = propose_price("buyer", bp, seller_price, lot["ask_price"], qty)
            if (
                not math.isfinite(buyer_price)
                or buyer_price <= 0
                or buyer_price > bp["max_price"]
                or round(buyer_price * qty, 2) > bp["max_budget"]
            ):
                raise ValueError("Buyer agent exceeded its authorized budget; offer rejected")
            if buyer_price >= seller_price:
                agreed = seller_price
                rounds.append(
                    {
                        "round": n,
                        "speaker": profile["name"],
                        "price": agreed,
                        "message": "Provisional agreement, awaiting farmer selection.",
                    }
                )
                break
            opening = buyer_price
        if agreed is None:
            excluded.append((buyer, "No agreement within three rounds and owner limits."))
            continue
        offers.append(
            {
                "id": uid("offer"),
                "lot_id": lot["id"],
                "buyer": buyer,
                "buyer_name": profile["name"],
                "quantity": qty,
                "price": agreed,
                "total": round(qty * agreed, 2),
                "net": round(qty * agreed, 2),
                "transport_cost": 0,
                "distance_km": profile["distance_km"],
                "status": "active",
                "rounds": rounds,
                "mode": modes()["negotiation"],
                "expires_at": (datetime.now(UTC) + timedelta(minutes=30)).isoformat(),
            }
        )
    with transaction() as s:
        if (
            s["policies"] != snap["policies"]
            or s["lots"] != snap["lots"]
            or s["requirements"] != snap["requirements"]
        ):
            raise HTTPException(409, "Terms changed during negotiation; start again")
        for old in s["offers"]:
            if (
                old["lot_id"] == lot["id"]
                and old["status"] == "active"
                and (actor == "farmer" or old["buyer"] == actor)
            ):
                old["status"] = "superseded"
        s["offers"].extend(offers)
        for buyer, reason in excluded:
            event(s, reason, buyer, "trade")
        event(
            s,
            f"{len(offers)} eligible offers ready. Farmer selection required.",
            actor,
            "trade",
        )
    return {
        "offers": offers,
        "excluded": [{"buyer": b, "reason": r} for b, r in excluded],
    }


@app.post("/api/offers/{offer_id}/select")
def select(offer_id: str, x_actor: str = Header(default="farmer")):
    guard(actor_id(x_actor), "farmer")
    with transaction() as s:
        offer = find(s["offers"], offer_id)
        prior = next(
            (
                o
                for o in s["orders"]
                if o["offer_id"] == offer_id and o["status"] not in ("cancelled", "expired")
            ),
            None,
        )
        if prior:
            return prior
        if offer["status"] != "active" or offer["expires_at"] < now():
            raise ValueError("Offer is no longer active; negotiate again")
        if any(
            o["lot_id"] == offer["lot_id"]
            and o["status"] in ("awaiting_buyer", "reserved", "funded", "picked_up")
            for o in s["orders"]
        ):
            raise ValueError(
                "This lot already has an active agreement. Complete or cancel it first."
            )
        lot = find(s["lots"], offer["lot_id"])
        if offer["quantity"] > lot["quantity"] - lot["reserved"] - lot["sold"]:
            raise ValueError("Insufficient available harvest")
        order = {
            k: offer[k] for k in ("lot_id", "buyer", "buyer_name", "quantity", "price", "total")
        }
        order.update(
            {
                "id": uid("order"),
                "offer_id": offer_id,
                "crop": lot["crop"],
                "status": "awaiting_buyer",
                "delivery_date": date.today().isoformat(),
                "expires_at": (datetime.now(UTC) + timedelta(minutes=15)).isoformat(),
                "timeline": [{"status": "awaiting_buyer", "time": now()}],
            }
        )
        s["orders"].append(order)
        offer["status"] = "selected"
        event(
            s,
            f"Farmer selected {offer['buyer_name']}. Awaiting buyer confirmation.",
            offer["buyer"],
            "trade",
        )
    return order


@app.post("/api/orders/{order_id}/{action}")
def order_action(order_id: str, action: str, x_actor: str = Header(default="farmer")):
    actor = actor_id(x_actor)
    with transaction() as s:
        order = find(s["orders"], order_id)
        lot = find(s["lots"], order["lot_id"])
        permissions = {
            "confirm": order["buyer"],
            "fund": order["buyer"],
            "pickup": "farmer",
            "receive": order["buyer"],
            "release": "farmer",
        }
        if action == "cancel":
            if actor not in ("farmer", order["buyer"]):
                raise HTTPException(403, "Not your order")
            if order["status"] == "cancelled":
                return order
            if order["status"] not in ("awaiting_buyer", "reserved", "funded"):
                raise ValueError("Cannot cancel after pickup or expiry")
            if order["status"] in ("reserved", "funded"):
                lot["reserved"] = round(lot["reserved"] - order["quantity"], 2)
            order["refund"] = order["total"] if order["status"] == "funded" else 0
            order["status"] = "cancelled"
        else:
            if action not in permissions:
                raise HTTPException(404, "Unknown order action")
            guard(actor, permissions[action])
            expected, target = {
                "confirm": ("awaiting_buyer", "reserved"),
                "fund": ("reserved", "funded"),
                "pickup": ("funded", "picked_up"),
                "receive": ("picked_up", "received"),
                "release": ("received", "settled"),
            }[action]
            if order["status"] == target:
                return order
            if order["status"] != expected:
                raise ValueError(f"Order must be {expected} before {action}")
            if action == "confirm":
                if order["quantity"] > lot["quantity"] - lot["reserved"] - lot["sold"]:
                    raise ValueError("Harvest no longer available")
                bp = s["policies"][order["buyer"]]
                sp = s["policies"]["farmer"]
                if (
                    order["price"] < sp["min_price"]
                    or order["price"] > bp["max_price"]
                    or order["total"] > bp["max_budget"]
                    or order["quantity"] > bp["quantity"]
                    or order["quantity"] < sp["quantity"]
                ):
                    raise ValueError(
                        "Current owner price, quantity or budget limits no longer allow this agreement"
                    )
                distance = find(s["profiles"], order["buyer"])["distance_km"]
                if distance > min(bp["radius_km"], sp["radius_km"]):
                    raise ValueError("Current service radius no longer allows this agreement")
                lot["reserved"] = round(lot["reserved"] + order["quantity"], 2)
            if action == "fund":
                order["funded_amount"] = order["total"]
            if action == "receive":
                lot["reserved"] = round(lot["reserved"] - order["quantity"], 2)
                lot["sold"] = round(lot["sold"] + order["quantity"], 2)
                s["inventory"].append(
                    {
                        "id": uid("batch"),
                        "actor": order["buyer"],
                        "crop": lot["crop"],
                        "quantity": order["quantity"],
                        "unit": "kg",
                        "usable_until": (date.today() + timedelta(days=3)).isoformat(),
                    }
                )
                s["forecasts"].pop(order["buyer"], None)
            if action == "release":
                order["settled_amount"] = order["total"]
            order["status"] = target
        order["timeline"].append({"status": order["status"], "time": now()})
        event(
            s,
            f"Order {order['status'].replace('_', ' ')}. Payments and fulfillment are simulated.",
            order["buyer"],
            "trade",
        )
    return order


@app.post("/api/market/refresh")
def refresh(x_actor: str = Header(default="farmer")):
    actor_id(x_actor)
    result = market_quotes()
    with transaction() as s:
        s["market"] = result
    return result


# Login is scoped to one of four demo participants. Actor headers cannot override a session.


app.middleware("http")(identity.protect)


@app.post("/api/auth/login")
def login(payload: Payload, request: Request, response: Response):
    data = payload.model_dump()
    username, password = str(data.get("username", "")), str(data.get("password", ""))
    if len(password) > 128:
        raise HTTPException(422, "Password is too long")
    token = identity.authenticate(
        username, password, request.client.host if request.client else "local"
    )
    if not token:
        raise HTTPException(
            401, "Check your username and password, or wait a minute before trying again."
        )
    response.set_cookie(
        "harvest_session",
        token,
        httponly=True,
        samesite="strict",
        secure=request.url.scheme == "https",
        max_age=43200,
    )
    actor = identity.ACCOUNTS[username]
    _, s = read()
    return {"actor": actor, "onboarded": bool(s.get("onboarded", {}).get(actor))}


@app.get("/api/auth/session")
def current_session(request: Request):
    actor = identity.session(request)
    _, s = read()
    return {
        "actor": actor,
        "onboarded": bool(s.get("onboarded", {}).get(actor)) if actor else False,
    }


@app.post("/api/auth/logout")
def logout(request: Request, response: Response):
    identity.SESSIONS.pop(request.cookies.get("harvest_session", ""), None)
    response.delete_cookie("harvest_session")
    return {"ok": True}


@app.post("/api/auth/onboard")
def onboard(payload: Payload, x_actor: str = Header(default="farmer")):
    actor = actor_id(x_actor)
    data = payload.model_dump()
    name, location = str(data.get("name", "")).strip(), str(data.get("location", "")).strip()
    if not 2 <= len(name) <= 80 or not 2 <= len(location) <= 120:
        raise ValueError("Enter a name and location (2–80 and 2–120 characters).")
    with transaction() as s:
        find(s["profiles"], actor).update(name=name, location=location)
        s.setdefault("onboarded", {})[actor] = True
    return {"actor": actor, "onboarded": True}


@app.post("/api/localize")
def localize(payload: Payload):
    data = payload.model_dump()
    return {
        "translations": assistance.translate(data.get("texts", []), data.get("language", "en-IN"))
    }


@app.post("/api/assistant")
def assistant_reply(payload: Payload, x_actor: str = Header(default="farmer")):
    actor = actor_id(x_actor)
    data = payload.model_dump()
    question = str(data.get("question", "")).strip()
    if not 1 <= len(question) <= 1000:
        raise ValueError("Ask a question of up to 1,000 characters.")
    _, s = read()
    scoped = public_state(s, actor, modes())
    context = {key: scoped.get(key) for key in ("lots", "offers", "orders", "market")}
    return {"text": assistance.reply(question, data.get("language", "en-IN"), context)}


@app.post("/api/assistant/speech")
def assistant_speech(payload: Payload):
    data = payload.model_dump()
    text = str(data.get("text", "")).strip()
    if not 1 <= len(text) <= 2400:
        raise ValueError("Speech text must contain 1–2,400 characters.")
    return {"audio": assistance.speech(text, data.get("language", "en-IN")), "mime": "audio/wav"}
