// Content from https://stackoverflow.com/questions/40115602/nodejs-multiple-requests

var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app = express();

//standard scrape path
app.get('/scrape', function (req, res) {

    categoriesArr = [];
    allCategoryItems = [];

    dataJson = {}; // Global json to hold all the data

    baseUrl = 'http://www.blahblah.org';
    //my case would be the specials page

//run first request
    request.get(baseUrl, function(error, response, html) {
            if (!error) {

                var $ = cheerio.load(html);

//this is standard scrape
                $('#categorySelector').filter(function() {
                    var data = $(this);
//finds the link he wants in secondary
                    var categoryItemLink = data.find('a').attr('href');
//pushes the secondary link to an array, method could be used in the for loop structure (i think)
                    categoriesArr.push({
                        "categoryItemLink": categoryItemLink
                    });

                });
//uses promise all in secondary pull, maps the array link to a function which is a promise
//******* LOOK UP PROMISE and FILTER as seen above and below */
//this promise action pulls in the array item and runs a secondary request similiar to a standard request


                Promise.all(categoriesArr.map(categoryObj => new Promise((resolve, reject)=>{
                    request.get(baseUrl + categoryObj.categoryItemLink, (error, response, html)=>{
                        if(error){
                            return reject(error);
                        }

                        var $ = cheerio.load(html);

                        $('#categoryItemSelector').filter(function() {
                            var data = $(this);
                            var categoryItemPageLinkElement = data.find('a');
                            var categoryItemPageLink = $(categoryItemPageLinkElement).attr('href');

                            if(typeof categoryItemPageLink != "undefinded" && categoryItemPageLink != null && categoryItemPageLink != "") {

                                allCategoryItems.push({
                                    "categoryItemPageLink": categoryItemPageLink
                                });

                            }
                        });

                        return resolve(res, html);
                    });
                }))).then(function(statesArray) {

                    Promise.all(allCategoryItems.map(categoryItemObject => new Promise((resolve, reject)=>{
                        request.get(baseUrl + categoryItemObject.categoryItemPageLink, (error, response, html)=>{
                            if(error){
                                return reject(error);
                            }
                            var $ = cheerio.load(html);
                            // Gather Data and put into dataJson

                            return resolve(response, html);
                        });
                    }))).then(function(data) {

                        // Do finishing stuff

                    }).catch(/*error*/);

                }).catch(/*error*/);

            }//END if(!error)
    });

})//END app.get()

app.listen('8081')
console.log('Magic happens on port 8081');
exports = module.exports = app;