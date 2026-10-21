import {test,expect} from '@playwright/test';
import {loginAs} from './auth';
test('Refresh failure preserves saved prices; successful retry updates provenance',async({page})=>{
 await loginAs(page);
 let success=false;
 await page.route('**/api/market/catalog/refresh',route=>route.fulfill({status:success?200:503,contentType:'application/json',body:JSON.stringify(success?{
 source:'Test government fixture',source_url:'https://agmarknet.gov.in/home',reporting_date:'2026-10-20',previous_reporting_date:'2026-10-19',retrieved_at:'2026-10-21T15:00:00Z',status:'fetched_government_report',refresh_result:'fetched',coverage:'Fixture national report',records:[{commodity:'Tomato',group:'Vegetables',price_quintal:1900,previous_price_quintal:1769.29,market:'All markets (national aggregate)'}]
 }:{detail:'Government website unavailable. Saved prices retained.'})}));
 await page.getByRole('button',{name:'Mandi prices',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Saved prices retained');
 await expect(page.locator('.government-provenance')).toContainText('2026-10-19');
 await page.getByRole('textbox',{name:'Search government prices'}).fill('Tomato');
 await expect(page.locator('.government-table')).toContainText('17.69');
 success=true;
 await page.getByRole('button',{name:'Refresh government prices',exact:true}).click();
 await expect(page.locator('.government-provenance')).toContainText('2026-10-20');
 await expect(page.locator('.government-table')).toContainText('19.00');
 await expect(page.getByRole('alert')).toHaveCount(0);
});
