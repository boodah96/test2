'use strict';
//require
require('dotenv').config();
const express = require('express');
const pg = require('pg');
const cors = require('cors')
const superagent = require('superagent');
const methodOverride = require('method-override')

//server
const app = express();

//uses
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('./public'));
app.set('view engine', 'ejs');
//PORT
const PORT = process.env.PORT || 3030

const client = new pg.Client(process.env.DATABASE_URL);
// const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

//******Routs**** */
app.get('/', homeHandler);
app.get('/getCountryResult', getCountryResultHandler)
app.get('/AllCountries', AllCountriesHandler)
app.post('/MyRecords', addToDBHandler)
app.get('/MyRecords', MyRecordsHandler)
app.get('/RecordDetails/:id', RecordDetailsHandler)
app.delete('/RecordDetails/:id', deleteDetailsHandler)
app.put('/RecordDetails/:id', updateDetailsHandler)

//******FunctionHandler******* */
function homeHandler(req, res) {
    let URL = 'https://api.covid19api.com/world/total';
    superagent.get(URL)
        .then(result => {
            res.render('pages/Home', { data: result.body })
        }).catch(error => errorHandler(error));
}

//////////////
function getCountryResultHandler(req, res) {
    let { country, from, to } = req.query;
    let URL = `https://api.covid19api.com/country/${country}/status/confirmed?from=${from}T00:00:00Z&to=${to}T00:00:00Z`;
    superagent.get(URL)
        .then(result => {
            res.render('pages/getCountryResult', { data: result.body })
        }).catch(error => res.send('country not found back to home page'));

}
//////////////
function AllCountriesHandler(req, res) {
    let URL = 'https://api.covid19api.com/summary';
    superagent.get(URL)
        .then(result => {
            let allCountries = result.body.Countries.map(country => {
                return new Country(country);
            })
            res.render('pages/AllCountries', { data: allCountries })
        }).catch(error => errorHandler(error));

}
///////////////
function addToDBHandler(req, res) {
    let { Country, TotalConfirmed, TotalDeaths, TotalRecovered, Date } = req.body;

    let SQL = 'INSERT INTO country (country, totalconfirmed, totaldeaths, totalrecovered, date) VALUES ($1,$2,$3,$4,$5);'
    let safeValues = [Country, TotalConfirmed, TotalDeaths, TotalRecovered, Date];
    console.log(safeValues);
    client.query(SQL, safeValues)
        .then(() => {
            res.redirect('/MyRecords');
        }).catch(error => errorHandler(error));

}
///Constructor

function Country(element) {
    this.Country = element.Country;
    this.TotalConfirmed = element.TotalConfirmed;
    this.TotalDeaths = element.TotalDeaths;
    this.TotalRecovered = element.TotalRecovered;
    this.Date = element.Date;
    this.CountryCode = element.CountryCode;

}
//////////
function MyRecordsHandler(req, res) {
    let SQL = 'SELECT * FROM country;'
    client.query(SQL)
        .then(result => {
            res.render('pages/MyRecords', { data: result.rows })

        }).catch(error => errorHandler(error));
}
////RecordDetailsHandler
function RecordDetailsHandler(req, res) {

    let id = req.params.id;
    let SQL = 'SELECT * FROM country WHERE id=$1;'
    let safeValues = [id];
    client.query(SQL, safeValues)
        .then(result => {
            res.render('pages/RecordDetails', { data: result.rows })

        }).catch(error => errorHandler(error));
}
///deleteDetailsHandler
function deleteDetailsHandler(req, res) {
    let id = req.params.id;
    let SQL = 'DELETE FROM country WHERE id=$1;'
    let safeValues = [id];
    client.query(SQL, safeValues)
        .then(() => {
            res.redirect('/MyRecords');

        }).catch(error => errorHandler(error));



}
/////updateDetailsHandler
function updateDetailsHandler(req, res) {
    let id = req.params.id;

    let { country, totalconfirmed, totaldeaths, totalrecovered, date } = req.body;
    let SQL = 'UPDATE country SET country=$1, totalconfirmed=$2, totaldeaths=$3, totalrecovered=$4, date=$5  WHERE id=$6;'
    let safeValues = [country, totalconfirmed, totaldeaths, totalrecovered, date, id];
    client.query(SQL, safeValues)
        .then(() => {
            res.redirect(`/RecordDetails/${id}`)
        })
}
//errorHandler
function errorHandler(error, req, res) {
    res.status(500).send(error);
}
app.get('*', errorNotFound)

function errorNotFound(req, res) {
    res.status(404).send('NOT FOUND')
}

/////////////
client.connect()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`listening to port ${PORT}`);
        })
    })