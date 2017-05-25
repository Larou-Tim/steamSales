

// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var Note = require("./app/models/Note.js");
var Sale = require("./app/models/Sale.js");
var request = require("request");
var cheerio = require("cheerio");

mongoose.Promise = Promise;
var app = express();
app.use(bodyParser.urlencoded({
    extended: false
}));


// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

var exphbs = require("express-handlebars");
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
//unable to set new path to views, needs to be in same directory?
// app.engine('hbs', exphbs({extname:'handlebars', defaultLayout:'main', layoutsDir: __dirname + '/app/views'}));
app.set("view engine", "handlebars");

// Make public a static dir
app.use(express.static("./app/public"));

// Database configuration with mongoose
mongoose.connect("mongodb://localhost/steam_sales");
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function (error) {
    console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function () {
    console.log("Mongoose connection successful.");
});


// Routes
// ======


/*intital steam pull. 
    need a way to make sure game has not already been added, if game is added update price?
    I do not want double posts

    URL could be primary key?

    //add this to schema
*/

//https://stackoverflow.com/questions/24122981/how-to-stop-insertion-of-duplicate-documents-in-a-mongodb-collection
// could add index

//unhandeled validation error, need to look into
//change url to http://store.steampowered.com/search/?specials=1 (could do more than one page)
// add rating and image?
// lowest price seen



// > a:nth-child(2)
//
//could be crazy double call to get additional info? not sure if it'll let me

app.get("/findSales", function (req, res) {
    for (var n = 1; n <= 5; n++) {
        request("http://store.steampowered.com/search/?specials=1&page=" + n, function (error, response, html) {
            var $ = cheerio.load(html);
            var result = [];
            $("#search_result_container > div:nth-child(2)").each(function (i, element) {
                // var $this = $(this);
                $(".search_result_row").each(function (j, inElement) {
                    // $("a.tab_item").each(function (j, inElement) {

                    var link = $(this).attr("href");

                    // var originalPrice = $(inElement).find(".discount_original_price").text()

                    var name = $(inElement).find(".title").text().trim();
                    var releaseDate = $(inElement).find(".search_released").text();
                    var reviews = $(inElement).find(".search_review_summary").attr("data-store-tooltip");
                    var image = $(inElement).find(".search_capsule > img").attr("src");
                    var percent = $(inElement).find(".search_discount > span").text();

                    var gameDesc;
                    var gameTags = [];

                    //i probably don't need the array for the promise all, but will start with this
                    var gameDesLinks = [link]

                    //just recalc the percent
                    percent = Number(percent.substring(0, percent.length - 1).substring(1))

                    //prices are contained in same element, need to split
                    var price = $(inElement).find(".discounted").text().trim()
                    var prices = price.split("$");
                    var originalPrice = Number(prices[1]);
                    var discountPrice = Number(prices[2]);

                    var goodDeal = false;
                    if (percent > 74) {
                        goodDeal = true;
                    }

                    // current second request, not a good place

                    Promise.all(gameDesLinks.map(gameDescription => new Promise((resolve, reject) => {
                        request.get(gameDesLinks[0], (error, response, html) => {

                            if (error) {
                                return reject(error);
                            }

                            var $ = cheerio.load(html);
                            // console.log("link is", gameDesLinks[0])
                            // #game_highlights > div.rightcol > div > div.game_description_snippet
                            gameDesc = $("#game_highlights > div.rightcol > div > div.game_description_snippet").text().trim();
                            largeImage = $("#game_highlights > div.rightcol > div > div.game_header_image_ctn > img").attr("src")
                            $("#game_highlights > div.rightcol > div > div.glance_ctn_responsive_right > div > div.glance_tags.popular_tags > a").each(function (j, tagElements) {
                                var currentTag = $(this).text();
                    
                                currentTag = currentTag.replace(/\t/g,"");
                                currentTag = currentTag.replace("\r","");
                                currentTag = currentTag.replace("\n","");
                                //chracters removed to make it easy to do datavalues
                                /*Orginally attempted to have div hoverbox for each element using handlebars to populate, 
                                positioning easy fix is single hoverbox that is jquery developed due to realtive position issues not 
                                sizing box correctly*/
                                currentTag = currentTag.replace(" ","-");
                                currentTag = currentTag.replace("&","");
                                gameTags.push(currentTag);
                            });
                            return resolve(res, html);
                        });
                    }))).then(function (data) {

                        // console.log(gameDesc)
                        var game = {
                            game_name: name,
                            game_reviews: reviews,
                            game_image_small: image,
                            game_image_large: largeImage,
                            good_deal: goodDeal,
                            game_tags: gameTags,
                            game_description: gameDesc,
                            release_date: releaseDate,
                            original_price: originalPrice,
                            discount_price: discountPrice,
                            discount_pct: percent,
                            game_link: link
                        }


                        // method to use mongoose as simple upsert breaks due to constructor creating an id, which is immutable
                        // Setup stuff

                        var query = { game_name: game.game_name },
                            update = {
                                original_price: game.original_price,
                                discount_price: game.discount_price,
                                discount_percent: game.discount_pct
                            },
                            options = { upsert: false };

                        if (name != "" && percent != "" && originalPrice != "" && discountPrice != "" && percent != "" && link != "") {
                            // Find the document
                            Sale.findOneAndUpdate(query, update, options, function (error, entry) {
                                if (!error) {
                                    // If the document doesn't exist
                                    if (!entry) {
                                        // Create it
                                        entry = new Sale(game);
                                    }
                                    // Save the document
                                    entry.save(function (error) {
                                        if (!error) {
                                            // Do something with the document
                                        } else {
                                            throw error;
                                        }
                                    });
                                }
                            });
                        }
                    });
                });
            });
        });
        console.log(n + " is complete");
    }
});
// });



//orgininal

// app.get("/findSales", function (req, res) {
//     request("http://store.steampowered.com/", function (error, response, html) {
//         var $ = cheerio.load(html);
//         var result = [];
//         $("#tab_specials_content").each(function (i, element) {
//             $("a.tab_item").each(function (j, inElement) {

//                 var link = $(this).attr("href");

//                 var originalPrice = $(inElement).find(".discount_original_price").text()
//                 var discountPrice = $(inElement).find(".discount_final_price").text()
//                 var name = $(inElement).find(".tab_item_name").text().trim()
//                 var percent = Number($(inElement).find(".discount_pct").text())
//                 name = name.trim();

//                 originalPrice = Number(originalPrice.replace(/[^0-9\.]+/g, ""));
//                 discountPrice = Number(discountPrice.replace(/[^0-9\.]+/g, ""));

//                 var game = {
//                     game_name: name,
//                     original_price: originalPrice,
//                     discount_price: discountPrice,
//                     discount_percent: percent,
//                     game_link: link
//                 }


//                 // method to use mongoose as simple upsert breaks due to constructor creating an id, which is immutable
//                 // Setup stuff
//                 var query = { game_name: game.game_name },
//                     update = {
//                         original_price: originalPrice,
//                         discount_price: discountPrice,
//                         discount_percent: percent
//                     },
//                     options = { upsert: false };

//                 if (name != "" && percent != "" && originalPrice != "" && discountPrice != "" && percent != "" && link != "") {
//                     // Find the document
//                     Sale.findOneAndUpdate(query, update, options, function (error, entry) {
//                         if (!error) {
//                             // If the document doesn't exist
//                             if (!entry) {
//                                 // Create it
//                                 entry = new Sale(game);
//                             }
//                             // Save the document
//                             entry.save(function (error) {
//                                 if (!error) {
//                                     // Do something with the document
//                                 } else {
//                                     throw error;
//                                 }
//                             });
//                         }
//                     });
//                 }

//                 //original method which should work in normal mongo?
//                 // if (name != "" && percent != "") {
//                 //     Sale.findOneAndUpdate({ game_link: game.game_link }, entry, { upsert: true }, function (err, doc) {
//                 //         if (err) return res.send(500, { error: err });

//                 //     });
//                 // }

//             });
//         });
//     });
// });


// Serve index.handlebars to the root route.
app.get("/", function (req, res) {
    Sale.find({}, function (err, data) {

        if (err) {
            throw err;
        }
        res.render("index", { deals: data });
    });
});

//A to Z
app.get("/alpha", function (req, res) {

    // .find(query, fields, { skip: 10, limit: 5 }
    Sale.find({}).sort({ game_name: 1 }).exec(

        function (err, data) {

            if (err) {
                throw err;
            }
            res.render("index", { deals: data });
        });
});

//Z to A
app.get("/zeta", function (req, res) {
    Sale.find({}).sort({ game_name: -1 }).exec(

        function (err, data) {

            if (err) {
                throw err;
            }
            res.render("index", { deals: data });
        });
});



//cheapest
app.get("/cheapest", function (req, res) {
    Sale.find({}).sort({ discount_price: 1 }).exec(

        function (err, data) {

            if (err) {
                throw err;
            }
            res.render("index", { deals: data });
        });
});
//highest discount percents
app.get("/bestdiscount", function (req, res) {
    Sale.find({}).sort({ discount_pct: -1 }).exec(

        function (err, data) {

            if (err) {
                throw err;
            }
            res.render("index", { deals: data });
        });
});

app.listen(3000, function () {
    console.log("App running on port 3000!");
});



