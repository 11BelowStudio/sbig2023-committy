/**
 * 
 * This is a file containing a bunch of constants
 */

/*
const {
    preprocessWordLists,
    textToLatin,
    doesContainBadWords,
    findBadWordLocations,
    replaceBadWords
} = require('deep-profanity-filter');
const leofilter = require('leo-profanity');
const { verifyImageURL } = require("verify-image-url");
*/

import {
    preprocessWordLists,
    textToLatin,
    doesContainBadWords,
    findBadWordLocations,
    replaceBadWords
} from 'deep-profanity-filter';
import leofilter from 'leo-profanity';
import { verifyImageURL }from "verify-image-url";



/**
 * Constants for cards to adhere to basically
 * @constant
 * @type {card_consts}
 * @property {number} card_name_length - maximum length of card name
 * @property {number} card_desc_length - maximum length of card description
 * @property {number} card_img_url_length - maximum length of card image URL
 * @property {number} card_stat_max - maximum value of an individual stat
 * @property {number} card_stat_min - minimum number of an individual stat
 * @property {number} card_stat_total_max - maximum total number of stat points
 * @property {function} card_id_to_css_class - returns the CSS class name for a given card ID
 */
const card_consts = {
  card_name_length: 29,
  card_desc_length: 125,
  card_img_url_length: 125,
  card_stat_max: 10,
  card_stat_min: 1,
  card_stat_total_max: 21,

  /**
   * Given a card's ID number, returns the CSS class name for the colour it should have
   * @param {number | string} id_number the id of the card (string or number)
   * @returns {string} name of the appropriate CSS class to use
   */
  card_id_to_css_class: function (id_number) {
    return {
      0: "card_red",
      1: "card_green",
            2: "card_blue",
            3: "card_orange",
            4: "card_yellow",
            5: "card_purple",
            6: "card_gray"
        }[(id_number % 7)];
    }
};

/**
 * Probably redundant.
 *
 * @constant
 * @type {{project_name: string, url_base: string}} glitchcom_consts
 * @property {string} project_name - the name of the project on Glitch.com
 * @property {string} url_base - the base URL of the project on Glitch.com
 */
const glitchcom_consts={
  project_name: "sbig2023-committy",
  url_base: `@{project_name}.glitch.me`
};

/**
 *
 * @typedef {Object} filtering

 */

/**
 * Constants for word filtering purposes
 * @constant
 * @property {import("deep-profanity-filter/dist/wordlist_preprocessor.d.ts").ProcessedWordLists} deep_word_filter - list of words to filter out
 * @property {function} string_contains_bad_words - checks if a string contains bad words
 * @property {function} censor_string - censors bad words from strings
 * @property {function} check_image_url_simple - simple check for whether or not a string probably is an image URL
 * @property {function} to_image_url - checks if given string is an image URL and obtains the image URL
 * @type {filtering}
 */
const filtering = {
  /**
   * deep-profanity-filter preprocessed word list
   */
  deep_word_filter: preprocessWordLists(
    leofilter.list().concat(["fag"]),
    ["suck", "scatman", "tit", "xx", "penistone", "scunthorpe", "shit", "homo"]
  ),

  /**
   * checks if a string contains bad words.
   * @param {string} strIn
   * @returns {boolean} true if the string contains bad words
   */
  string_contains_bad_words: function (strIn) {

    return (
      doesContainBadWords(
        textToLatin(strIn),
        this.deep_word_filter
      )
    );

  },

  /**
   * censors bad words from strings
   * @param {string} strIn
   * @returns {string}  string but with naughty words censored
   */
  censor_string: function(strIn){
    const found_locations = findBadWordLocations(
      textToLatin(strIn),
      this.deep_word_filter
    );

    return replaceBadWords(strIn, found_locations);
  },

  /**
   * simple check for whether or not a string probably is an image URL
   * @param {string} url
   * @returns {boolean} true if string ends in '.jpeg','.jpg','.gif', or '.png'
   */
  check_image_url_simple: function(url) {
    return(url.match(/\.(jpeg|jpg|gif|png|svg)$/) != null);
  },

  /**
   * checks if given string is an image URL and obtains the image URL
   * @param {string} url
   * @returns {string} the URL if it's an image URL, "" otherwise.
   */
  to_image_url: async(url) => {

    if (url == null || url.trim() === ""){
      return "";
    }

    let url2 = url.trim();

    const urlparts = url2.split('?');
    if (urlparts.length >= 2){
      url2 = urlparts[0];
    }

    const result = await verifyImageURL(url2);

    if (result == null){
        return "";
    }

    if (!result.isImage){
        return "";
    }

    return result.imageURL;


  }

}

export {
    card_consts,
    glitchcom_consts,
    filtering
}