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
var PORT = process.env.PORT || 3000;

// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

var exphbs = require("express-handlebars");
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Make public a static dir
app.use(express.static("./app/public"));

// Database configuration with mongoose
// mongoose.connect("mongodb://localhost/steam_sales");

mongoose.connect("mongodb://heroku_cqmp3frb:ifa5bamtt4nu7fece1hqq584kg@ds153501.mlab.com:53501/heroku_cqmp3frb");
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

//https://stackoverflow.com/questions/24122981/how-to-stop-insertion-of-duplicate-documents-in-a-mongodb-collection
// could add index


app.get("/findSales", function (req, res) {
    res.render("load")
    var gameCount = 0;
    var completed = 0;
    var allPromises = [];
    for (var n = 1; n <= 5; n++) {
        request("http://store.steampowered.com/search/?specials=1&page=" + n, function (error, response, html) {
            var $ = cheerio.load(html);
            var result = [];
            $("#search_result_container > div:nth-child(2)").each(function (i, element) {
                $(".search_result_row").each(function (j, inElement) {
                    gameCount++;
                    console.log(gameCount)
                    var link = $(this).attr("href");

                    var name = $(inElement).find(".title").text().trim();
                    var releaseDate = $(inElement).find(".search_released").text();
                    var reviews = $(inElement).find(".search_review_summary").attr("data-store-tooltip");
                    var image = $(inElement).find(".search_capsule > img").attr("src");
                    var percent = $(inElement).find(".search_discount > span").text();

                    var gameDesc;
                    var gameTags = [];

                    //i probably don't need the array for the promise all, but will start with this
                    var gameDesLinks = [link]
                    //used to determine when everything is done to refresh
                    

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

                    // current second request, should add a cookie to bypass age verification

                    Promise.all(gameDesLinks.map(gameDescription => new Promise((resolve, reject) => {
                        request.get(gameDesLinks[0], (error, response, html) => {

                            if (error) {
                                return reject(error);
                            }
                        
                            var $ = cheerio.load(html);
                            
                            gameDesc = $("#game_highlights > div.rightcol > div > div.game_description_snippet").text().trim();
                            largeImage = $("#game_highlights > div.rightcol > div > div.game_header_image_ctn > img").attr("src")
                            $("#game_highlights > div.rightcol > div > div.glance_ctn_responsive_right > div > div.glance_tags.popular_tags > a").each(function (j, tagElements) {
                                var currentTag = $(this).text();

                                currentTag = currentTag.replace(/\t/g, "");
                                currentTag = currentTag.replace("\r", "");
                                currentTag = currentTag.replace("\n", "");
                                //chracters removed to make it easy to do datavalues

                                currentTag = currentTag.replace(" ", "-");
                                currentTag = currentTag.replace("&", "");
                                gameTags.push(currentTag);
                            });
                            return resolve(res, html);
                        });
                    }))).then(function (data) {
                        var gameReview = ''
                        var reviewArr;
                        if (reviews) {
                            reviewArr = reviews.split("<")

                            gameReview = reviewArr[0]
                        }

                        var game = {
                            game_name: name,
                            game_reviews: gameReview,
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
                                game_reviews: gameReview,
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
                            },
                            options = { upsert: false };
                        completed++
                        allPromises.push(completed);
                        console.log("done with:", completed)
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
                })
            });
        });
    }
    // Promise.all(allPromises)
    
    //     .then(function () {
    //         console.log("Done")
    //     //     Sale.find()
    //     //         .populate("note")
    //     //         .exec(
    //     //         function (err, data) {

    //     //             if (err) {
    //     //                 throw err;
    //     //             }
    //     //             res.render("index", { deals: data });
    //     //         });
    //     });
});
// });


// Serve index.handlebars to the root route.
app.get("/", function (req, res) {
    Sale.find()
        .populate("note")
        .exec(
        function (err, data) {

            if (err) {
                throw err;
            }
            res.render("index", { deals: data });
        });
});


//A to Z
app.get("/alpha/:page", function (req, res) {
    var curUrl = req.url;
    sortPull("game_name", "asc", req.params.page, res, curUrl);
});

//Z to A
app.get("/zeta/:page", function (req, res) {
    var curUrl = req.url;
    sortPull("game_name", "desc", req.params.page, res, curUrl);

    // Sale.find({}).sort({ game_name: -1 }).exec(

    //     function (err, data) {

    //         if (err) {
    //             throw err;
    //         }
    //         res.render("index", { deals: data });
    //     });
});



//cheapest
app.get("/cheapest/:page", function (req, res) {
    var curUrl = req.url;
    sortPull("discount_price", "asc", req.params.page, res, curUrl);

    // Sale.find({}).sort({ discount_price: 1 }).exec(

    //     function (err, data) {

    //         if (err) {
    //             throw err;
    //         }
    //         res.render("index", { deals: data });
    //     });
});
//highest discount percents
app.get("/bestdiscount/:page", function (req, res) {
    var curUrl = req.url;
    sortPull("discount_pct", "desc", req.params.page, res, curUrl);

    // Sale.find({}).sort({ discount_pct: -1 }).exec(

    //     function (err, data) {

    //         if (err) {
    //             throw err;
    //         }
    //         res.render("index", { deals: data });
    //     });
});

app.get("/game/:name", function (req, res) {

    var name = req.params.name;

    Sale.find({ game_name: new RegExp(name, 'i') }).sort({ game_name: 1 }).exec(

        function (err, data) {

            if (err) {
                throw err;
            }
            res.render("index", { deals: data });
        });
});

app.post("/notes/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    var newNote = new Note(req.body);

    // And save the new note the db
    newNote.save(function (error, doc) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Otherwise
        else {
            // Use the article id to find and update it's note
            Sale.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
                // Execute the above query
                .exec(function (err, doc) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                    }
                    else {
                        // Or send the document to the browser
                        res.send(doc);
                    }
                });
        }
    });
});

app.listen(PORT, function () {
    console.log("App running on port 3000!");
});



function sortPull(field, type, pageNumber, res, currentPath) {
    var sortQuery = {
        [field]: type
    }

    var curPathArr = currentPath.split("/")
    var pathArr = []
    //can dynamically create the upper limit based on results in db
    for (var i = 1; i < 6; i++) {

        pathArr.push(
            {
                path: "/" + curPathArr[1] + "/" + i,
                pathNum: i
            });
    }

    var perPage = 25
        , page = Math.max(0, pageNumber - 1);

    Sale.find()
        .limit(perPage)
        .skip(perPage * page)
        .sort(sortQuery)
        .populate("note")
        .exec(

        function (err, data) {

            if (err) {
                throw err;
            }
            res.render("index", { deals: data, paths: pathArr });
        });
}