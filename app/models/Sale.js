

//add dates
// add lowest price?
var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var SaleSchema = new Schema({

    game_name: {
        type: String
        // required: true
    },

    game_link: {
        type: String
        // required: true
    },

    release_date: {
        type: String
        // required: true
    },
    game_reviews: {
        type: String
        // required: true
    },

    game_image: {
        type: String
        // required: true
    },

    original_price: {
        type: Number
        // required: true
    },
    discount_price: {
        type: Number
        // required: true
    },
    discount_pct: {
        type: Number
        // required: true
    },
    
    good_deal: {
        type: Boolean
    },
    // This only saves one note's ObjectId, ref refers to the Note model
    note: {
        type: Schema.Types.ObjectId,
        ref: "Note"
    }
});

var Sale = mongoose.model("Sale", SaleSchema);

// Export the model
module.exports = Sale;
