
// noinspection SpellCheckingInspection
/**
 * Constants for cards to adhere to basically
 * @typedef {Object} card_consts
 * @property {number} card_name_length - maximum length of card name
 * @property {number} card_desc_length - maximum length of card description
 * @property {number} card_img_url_length - maximum length of card image URL
 * @property {number} card_stat_max - maximum value of an individual stat
 * @property {number} card_stat_min - minimum number of an individual stat
 * @property {number} card_stat_total_max - maximum total number of stat points
 * @property {function} card_id_to_css_class - returns the CSS class name for a given card ID
 */

/**
 * @constant
 * @type {card_consts}
 */
const card_consts = {
  card_name_length : 29,
  card_desc_length: 125,
  card_img_url_length : 125,
  card_stat_max : 10,
  card_stat_min : 1,
  card_stat_total_max : 21,

  /**
   * Given a card's ID number, returns the CSS class name for the colour it should have
   * @param {number | string} id_number the id of the card (string or number)
   * @returns {string} name of the appropriate CSS class to use
   */
  card_id_to_css_class: function(id_number){
    if (id_number === undefined || id_number === null || id_number === ""){
      return "card_error";
    }
    try{
      return {
        0: "card_red",
        1: "card_green",
        2: "card_blue",
        3: "card_orange",
        4: "card_yellow",
        5: "card_purple",
        6: "card_gray"
      }[(id_number % 7)];
    } catch (error){
      return "card_error";
    }
  }
}
