/**
 * 
 * This is a file containing a bunch of constants
 */
const {
    preprocessWordLists,
    textToLatin,
    doesContainBadWords
} = require('deep-profanity-filter');
const leofilter = require('leo-profanity');
const { verifyImageURL } = require("verify-image-url");

module.exports = {


    /**
     * Constants for cards to adhere to basically
     */
    card_consts: {
        card_name_length : 29,
        card_desc_length: 61,
        card_img_url_length : 125,
        card_stat_max : 10,
        card_stat_min : 1,
        card_stat_total_max : 21
    },

    /**
     * Constants for word filtering purposes
     */
    filtering : {
        /**
         * deep-profanity-filter preprocessed word list
         */
        deep_word_filter: preprocessWordLists(
            leofilter.list(),
            ["suck","scatman", "title","xx","penistone","scunthorpe"]
        ),

        /**
         * checks if a string contains bad words.
         * @param {string} strIn 
         * @returns true if the string contains bad words
         */
        string_contains_bad_words: function(strIn) {
            
            return (
                doesContainBadWords(
                    textToLatin(strIn),
                    this.deep_word_filter
                )
            );
            
        },

        /**
         * simple check for whether or not a string probably is an image URL
         * @param {string} url 
         * @returns true if string ends in '.jpeg','.jpg','.gif', or '.png'
         */
        check_image_url_simple: function(url) {
            return(url.match(/\.(jpeg|jpg|gif|png|svg)$/) != null);
        },

        /**
         * checks if given string is an image URL and obtains the image URL
         * @param {string} url 
         * @returns the URL if it's an image URL, "" otherwise.
         */
        to_image_url: async(url) => {

            if (url == null || url.trim() === ""){
                return "";
            }

            var url2 = url.trim();

            var urlparts = url2.split('?');
            if (urlparts.length >= 2){
                url2 = urlparts[0];
            }

            var result = await verifyImageURL(url2);

            if (result == null){
                return "";
            }

            if (!result.isImage){
                return "";
            }

            return result.imageURL;

            
        }

    }

    
}