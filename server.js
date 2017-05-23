

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
app.get("/findSales", function (req, res) {
    request("http://store.steampowered.com/", function (error, response, html) {
        var $ = cheerio.load(html);
        var result = [];
        $("#tab_specials_content").each(function (i, element) {
            $("a.tab_item").each(function (j, inElement) {

                var link = $(this).attr("href");

                var originalPrice = $(inElement).find(".discount_original_price").text()
                var discountPrice = $(inElement).find(".discount_final_price").text()
                var name = $(inElement).find(".tab_item_name").text()
                var percent = Number($(inElement).find(".discount_pct").text())

                originalPrice = Number(originalPrice.replace(/[^0-9\.]+/g, ""));
                discountPrice = Number(discountPrice.replace(/[^0-9\.]+/g, ""));

                var game = {
                    game_name: name,
                    original_price: originalPrice,
                    discount_price: discountPrice,
                    discount_percent: percent,
                    game_link: link
                }


                // method to use mongoose as simple upsert breaks due to constructor creating an id, which is immutable
                // Setup stuff
                var query = { game_name: game.game_name },
                    update = {
                        original_price: originalPrice,
                        discount_price: discountPrice,
                        discount_percent: percent
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

                //original method which should work in normal mongo?
                // if (name != "" && percent != "") {
                //     Sale.findOneAndUpdate({ game_link: game.game_link }, entry, { upsert: true }, function (err, doc) {
                //         if (err) return res.send(500, { error: err });

                //     });
                // }

            });
        });
    });
});


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



