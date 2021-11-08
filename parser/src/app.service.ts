import {Injectable} from '@nestjs/common';
import {Pool} from 'pg';

const puppeteer = require('puppeteer')
const config = {
    user: 'postgres',
    host: 'localhost',
    database: 'Sanction List',
    password: 'qwerty',
    port: 5432,
};

const pool = new Pool(config);

@Injectable()
export class AppService {
    public static async search(page, type, country) {
        await page.evaluate((type, country) => {
            console.log(type)
            document.querySelector('#ctl00_MainContent_ddlType')["value"] = type
            document.querySelector('#ctl00_MainContent_ddlCountry')["value"] = country
            document.querySelector('#ctl00_MainContent_Slider1')["value"] = '50'
            // @ts-ignore
            document.querySelector('#ctl00_MainContent_btnSearch').click()
        }, type, country);
    }

    async scrapData(): Promise<string> {
        const browser = await puppeteer.launch({headless: true,});
        const page = await browser.newPage();
        await page.goto('https://sanctionssearch.ofac.treas.gov/');
        await page.waitForSelector('#ctl00_MainContent_ddlCountry')
        //collect all countries
        let countries = await page.evaluate(async () => {
            // @ts-ignore
            return Array.from(document.querySelectorAll('#ctl00_MainContent_ddlCountry > option')).map(t => t.value).slice(1);
        });
        const types = ["Entity", "Individual"]

        for (let type of types) {
            for (let country of countries) {
                console.log(type, country)
                //change params for search and search
                await AppService.search(page, type, country)
                //if error then trying to search again with cooldown in 100 sec
                while (true) {
                    try {
                        await page.waitForSelector('#ctl00_MainContent_btnSearch', {timeout: 500})
                        break
                    } catch (e) {
                        await console.log('chilim')
                        await page.goto('https://sanctionssearch.ofac.treas.gov/');
                        await page.waitForTimeout(10000)
                        await console.log('pochilili')
                        try {
                            await page.waitForSelector("#ctl00_MainContent_btnSearch")
                            await AppService.search(page, type, country)
                        } catch (e) {
                            console.log(e)
                            console.log('упс, шось ще полетіло у вирій')
                        }
                    }
                }
                try {
                    await page.waitForSelector('#gvSearchResults', {timeout: 500})
                } catch (e) {
                    continue
                }
                let obj = {
                    entities_list: []
                }
                for (let el of await page.evaluate(async () => {
                    return Array.from(document.querySelectorAll('#gvSearchResults > tbody > tr>td>a')).map(t => t["href"])
                })) {
                    let pagenew = await browser.newPage()
                    await pagenew.goto(el)
                    await console.log(el, 'opened!')
                    let obj1 = {}
                    //якщо це юрліцо
                    if (type == "Entity") {
                        obj1["country_name"] = country
                        obj1["type"] = type
                        obj1["entity_name"] = await pagenew.$eval('#ctl00_MainContent_lblNameOther', (el) => el.innerText.trim())
                        obj1["list"] = await pagenew.$eval('#ctl00_MainContent_lblSourceListOther', (el) => el.innerText.trim())
                        obj1["program"] = await pagenew.$eval('#ctl00_MainContent_lblProgramOther', (el) => el.innerText.trim())
                        obj1["remarks"] = await pagenew.$eval('#ctl00_MainContent_lblRemarksOther', (el) => el.innerText.trim())

                        obj1["identifications"] = await pagenew.evaluate(async () => {
                            let entID = []
                            for (let t of await Array.from(document.querySelectorAll('#ctl00_MainContent_gvIdentification >tbody>tr')).slice(1)) {
                                let row = []
                                for (let r of await t.children) {
                                    // @ts-ignore
                                    await row.push(r.innerText.trim())
                                }
                                await entID.push(row)
                            }
                            return entID
                        })
                        obj1["aliases"] = await pagenew.evaluate(() => {

                            let aliases = []
                            for (let t of Array.from(document.querySelectorAll('#ctl00_MainContent_gvAliases >tbody>tr')).slice(1)) {
                                let row = []
                                for (let r of t.children) {
                                    // @ts-ignore
                                    row.push(r.innerText.trim())
                                }
                                aliases.push(row)
                            }
                            return aliases
                        })
                        obj1["addresses"] = await pagenew.evaluate(() => {
                            let addresses = []
                            let classtd = ''
                            let row = ['', '', '', '', '']
                            for (let t of Array.from(document.querySelectorAll('#ctl00_MainContent_pnlAddress>table >tbody>tr')).slice(1)) {
                                if (t.className === classtd) {
                                    for (let row_item = 0; row_item < t.children.length; row_item++) {
                                        // @ts-ignore
                                        row[row_item] = (row[row_item] + ' ' + t.children[row_item].innerText).trim()
                                    }
                                } else {
                                    classtd = t.className
                                    addresses.push(row)
                                    row = ['', '', '', '', '']
                                    for (let row_item = 0; row_item < t.children.length; row_item++) {
                                        // @ts-ignore
                                        row[row_item] = (row[row_item] + ' ' + t.children[row_item].innerText.trim())
                                    }
                                }

                            }
                            addresses.push(row)
                            return addresses
                        })

                        obj["entities_list"].push(obj1)
                    }
                    //якщо це фіздіцо
                    else if (type == "Individual") {

                        obj1["country_name"] = country
                        obj1["type"] = type
                        obj1["last_name"] = await pagenew.$eval('#ctl00_MainContent_lblLastName', (el) => el.innerText.trim())
                        obj1["first_name"] = await pagenew.$eval('#ctl00_MainContent_lblFirstName', (el) => el.innerText.trim())
                        obj1["title"] = await pagenew.$eval('#ctl00_MainContent_lblTitle', (el) => el.innerText.trim())
                        obj1["date_of_birth"] = await pagenew.$eval('#ctl00_MainContent_lblDOB', (el) => el.innerText.trim())
                        obj1["place_of_birth"] = await pagenew.$eval('#ctl00_MainContent_lblPOB', (el) => el.innerText.trim())
                        obj1["nationality"] = await pagenew.$eval('#ctl00_MainContent_lblNationality', (el) => el.innerText.trim())
                        obj1["citizenship"] = await pagenew.$eval('#ctl00_MainContent_lblCitizenship', (el) => el.innerText.trim())
                        obj1["list"] = await pagenew.$eval('#ctl00_MainContent_lblSourceList', (el) => el.innerText.trim())
                        obj1["program"] = await pagenew.$eval('#ctl00_MainContent_lblProgram', (el) => el.innerText.trim())
                        obj1["remarks"] = await pagenew.$eval('#ctl00_MainContent_lblRemarks', (el) => el.innerText.trim())

                        obj1["identifications"] = await pagenew.evaluate(async () => {
                            let entID = []
                            for (let t of await Array.from(document.querySelectorAll('#ctl00_MainContent_gvIdentification >tbody>tr')).slice(1)) {
                                let row = []
                                for (let r of await t.children) {
                                    // @ts-ignore
                                    await row.push(r.innerText.trim())
                                }
                                await entID.push(row)
                            }
                            return entID
                        })
                        obj1["aliases"] = await pagenew.evaluate(() => {

                            let aliases = []
                            for (let t of Array.from(document.querySelectorAll('#ctl00_MainContent_gvAliases >tbody>tr')).slice(1)) {
                                let row = []
                                for (let r of t.children) {
                                    // @ts-ignore
                                    row.push(r.innerText.trim())
                                }
                                aliases.push(row)
                            }
                            return aliases
                        })
                        obj1["addresses"] = await pagenew.evaluate(() => {
                            let addresses = []
                            let classtd = ''
                            let row = ['', '', '', '', '']
                            for (let t of Array.from(document.querySelectorAll('#ctl00_MainContent_pnlAddress>table >tbody>tr')).slice(1)) {
                                if (t.className === classtd) {
                                    for (let row_item = 0; row_item < t.children.length; row_item++) {
                                        // @ts-ignore
                                        row[row_item] = (row[row_item] + ' ' + t.children[row_item].innerText).trim()
                                    }
                                } else {
                                    classtd = t.className
                                    addresses.push(row)
                                    row = ['', '', '', '', '']
                                    for (let row_item = 0; row_item < t.children.length; row_item++) {
                                        // @ts-ignore
                                        row[row_item] = (row[row_item] + ' ' + t.children[row_item].innerText).trim()
                                    }
                                }

                            }
                            addresses.push(row)
                            return addresses
                        })

                        obj["entities_list"].push(obj1)
                    }
                    console.log('collected')
                    await pagenew.close()
                }
                console.log(obj)
                /*тут повинен бути код який запихує все в бд*/
                for (let entity of obj["entities_list"]) {
                    let id = await entity['type'] == 'Entity' ?
                        await pool.query(`INSERT INTO entities_list (country_name,
                                                                     entity_name,
                                                                     list,
                                                                     program,
                                                                     remarks)
                                          VALUES ($1, $2, $3, $4, $5)
                                          RETURNING id;`,
                            [entity["country_name"], entity["entity_name"], entity["list"], entity["program"], entity["remarks"],]) :
                        await pool.query(`INSERT INTO individuals_list("country_name",
                                                                       "last_name",
                                                                       "first_name",
                                                                       "title",
                                                                       "date_of_birth",
                                                                       "place_of_birth",
                                                                       "list",
                                                                       "program",
                                                                       "nationality",
                                                                       "citizenship",
                                                                       "remarks")
                                          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                                          RETURNING "id";`,
                            [entity["country_name"],
                                entity["last_name"],
                                entity["first_name"],
                                entity["title"],
                                entity["date_of_birth"],
                                entity["place_of_birth"],
                                entity["list"],
                                entity["program"],
                                entity["nationality"],
                                entity["citizenship"],
                                entity["remarks"],])
                    id = id.rows[0].id
                    console.log('id: ', id)
                    if (entity['type'] == 'Entity') {
                        for (let ident of entity["identifications"]) {
                            await pool.query(`INSERT INTO entities_identifications(entity_id,
                                                                                   identification_type,
                                                                                   identification_id,
                                                                                   country,
                                                                                   issue_date,
                                                                                   expire_date)
                                              VALUES ($1, $2, $3, $4, $5, $6);`, [id].concat(ident))
                            console.log('ident loaded')
                        }
                        for (let alias of entity["aliases"]) {
                            await pool.query(`INSERT INTO entities_aliases(entity_id, aliases_type, category,
                                                                           name)
                                              VALUES ($1,
                                                      $2,
                                                      $3,
                                                      $4);`, [id].concat(alias))
                            console.log('aliases loaded')
                        }
                        for (let address of entity["addresses"]) {
                            await pool.query(`INSERT INTO entities_addresses(entity_id, address, city, province,
                                                                             postal_code, country)
                                              VALUES ($1,
                                                      $2,
                                                      $3,
                                                      $4,
                                                      $5,
                                                      $6);`, [id].concat(address))
                            console.log('addresses loaded')
                        }
                    }
                    else if (entity['type'] == 'Individual') {
                        for (let ident of entity["identifications"]) {
                            await pool.query(`INSERT INTO individuals_identifications( individuals_id,
                                                                                      identification_type,
                                                                                      identification_code, country,
                                                                                      issue_date, expire_date)
                                              VALUES ($1, $2, $3, $4, $5, $6);`, [id].concat(ident))
                            console.log('ident loaded')
                        }
                        for (let alias of entity["aliases"]) {
                            await pool.query(`INSERT INTO individuals_aliases( individuals_id, aliases_type,
                                                                              category, name)
                                              VALUES ($1,
                                                      $2,
                                                      $3,
                                                      $4);`, [id].concat(alias))
                            console.log('aliases loaded')
                        }
                        for (let address of entity["addresses"]) {
                            await pool.query(`INSERT INTO individuals_addresses(individuals_id, address, city,
                                                                                province, postal_code, country)
                                              VALUES ($1,
                                                      $2,
                                                      $3,
                                                      $4,
                                                      $5,
                                                      $6);`, [id].concat(address))
                            console.log('addresses loaded')
                        }
                    }
                }
            }
        }

        for (let index of countries) {
            console.log(index)
        }
        await browser.close();

        return countries.toString()
    }
}
