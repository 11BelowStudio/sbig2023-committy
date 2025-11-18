
/**
 * index page seo parameters
 * @constant
 * @property {string} title - game name (Committy!)
 * @property {string} description - short description of Committy
 * @property {string} url - the URL of where we're hosting Committy. DEFINED BY process.env.WEBSITE
 * @property {string} image - the URL of the image to use for SEO purposes.
 * Currently, serves the icon image (subdirectoried from process.env.WEBSITE),
 * but probably could be moved to a cdn image in the future
 * @property {string} db - the database we're using (currently only SQLite is supported)
 * @type {index_seo}
 */
const index_seo = {
  title: "Committy",
  description: "The collaborative card game that you may or may not regret unwillingly contributing to",
  url: `https://${process.env.WEBSITE}`,
  image: `https://${process.env.WEBSITE}/assets/icons/committy.svg`,
  db: "SQLite"
}

/**
 * @typedef {Object} page_seo - subpage SEO parameters
 * @property {string} title - title of the page
 * @property {string} description - short description of the page
 * @property {string} url - the URL of the page
 * @property {string} image - the URL of the image to use for SEO purposes
 */

/**
 * The 'view card' page seo parameters
 * @param id the ID of the card we're viewing (string, or numeric string)
 * @returns {page_seo} appropriate SEO parameters for the view card page
 */
function view_card_seo(id){


  if (id === undefined || id.toString().trim() === "" || id.toString().trim() === "random"){
    return {
      title: "Committy - View a random card!",
      description: "Ever wanted to see a random card from Committy? Well, now's your chance!",
      url: `${index_seo.url}/view_card`,
      image: index_seo.image
    }
  }
  return {
    title: `Committy - Viewing card #${id}`,
    description: "I wonder what this card is!",
    url: `${index_seo.url}//view_card/${id}`,
    image: index_seo.image
  }
}

/**
 * Obtains relevant SEO parameters for the game page
 * @param hand_size {number | string} size of dealt hand. either an int or an int string. min/default is 3
 * @param seed {string} the seed of the game, encoded in the url. defaults to empty string.
 * @returns {page_seo} relevant SEO parameters for the game page
 */
function mvp_game_seo(hand_size, seed) {
  if (hand_size === undefined || parseInt(hand_size) < 3){
    hand_size = 3
  }
  if (seed === undefined){
    seed = ""
  }
  return {
    title: "Committy (the game itself)",
    description: "Simply pick whichever card you think is objectively superior to whatever card you think your opponent will choose.",
    url: `${index_seo.url}/game/${hand_size}/${seed}`,
    image: index_seo.image
  }
}
/**
 * Obtains relevant SEO parameters for the 'judgement' page (choosing the objectively superior card)
 * @param hand_size {number | string} size of dealt hand. either an int or an int string. min/default is 3
 * @param seed {string} the seed of the game, encoded in the url. defaults to empty string.
 * @returns {page_seo} relevant SEO parameters for the  page
 */
function mvp_judgement_seo(c1, c2) {
  return {
    title: "Committy - Judgement time!",
    description: "Which of these two cards is objectively superior?",
    url: `${index_seo.url}/game/chosen/${c1}/${c2}`,
    image: index_seo.image
  }
}

/**
 * @constant
 * @type {page_seo}
 */
const submit_card_seo = {
  title: "Committy - Card Creator",
  description: "Do you think all of the existing cards in Committy are bad? Yes? Well, here's your chance to add something better",
  url: `${index_seo.url}/submit_card`,
  image: index_seo.image
}

/**
 * @constant
 * @type {page_seo}
 */
const mvp_verdict_seo = {
  title: "Committy - Judgement time!",
  description: "Let's see which card is the best card!",
  url: `${index_seo.url}/game/verdict`,
  image: index_seo.image
}

export{
  index_seo,
  view_card_seo,
  mvp_game_seo,
  mvp_judgement_seo,
  mvp_verdict_seo,
  submit_card_seo
};