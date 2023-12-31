/**
 * Module handles database management
 *
 * The sample data is for a chat log with one table:
 * Messages: id + message text
 */


import fs from "node:fs";
const dbFile = "./.data/cards.db";
const exists = fs.existsSync(dbFile);

import {
  card_consts,
  filtering
} from '../constants.js';


import {
  sample
} from "underscore";

import random from "random";

import seedrandom from "seedrandom";


//https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
/**
 * The better-sqlite3 database object
 * see https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
 */
import _db from "better-sqlite3";


// opens the database (or creates it if it didn't already exist)
const db = _db(
  dbFile,
  {
    "verbose": console.log
  }
);

let _backup_running = false;

// and we use write-ahead log for performance reasons
db.pragma('journal_mode = WAL');

// And now we populate db if it didn't already exist.
if (!exists){

  const cardsTableStmt = db.prepare(
    `CREATE TABLE cards (
        id INTEGER NOT NULL PRIMARY KEY,
        name TEXT NOT NULL,
        desc TEXT NOT NULL,
        img TEXT NOT NULL,
        stat1 INTEGER NOT NULL DEFAULT 1,
        stat2 INTEGER NOT NULL DEFAULT 1,
        stat3 INTEGER NOT NULL DEFAULT 1,
        stat4 INTEGER NOT NULL DEFAULT 1,
      CHECK (
        length(name) > 0
        AND
        (stat1 >= 1 AND stat1 <= 10)
        AND
        (stat2 >= 1 AND stat2 <= 10)
        AND
        (stat3 >= 1 AND stat3 <= 10)
        AND
        (stat4 >= 1 AND stat4 <= 10)
      )
    )
    `
  );

  cardsTableStmt.run();

  const defaultCards = [
    {
      name:"Kevin",
      desc:"Holy shit it's Kevin!!!",
      img: "https://i.imgur.com/rf0hpyh.png",
      s1: 10,
      s2: 3,
      s3: 4,
      s4: 2
    },
    {
      name:"Ke'in",
      desc:"Kevin's evil bri'ish counterpart. He's rather rude.",
      img: "https://i.imgur.com/hIHI4M5.png",
      s1: 2,
      s2: 5,
      s3: 4,
      s4: 10
    },
    {
      name:"An open Nokia E72",
      desc:"as photographed by highwycombe on wikipedia.",
      img: "https://upload.wikimedia.org/wikipedia/commons/6/65/NokiaE72Open.JPG",
      s1: 7,
      s2: 2,
      s3: 7,
      s4: 2
    }
  ];

  const insertCardStmt = db.prepare(
    `
    INSERT INTO
      cards(name, desc, img, stat1, stat2, stat3, stat4)
    VALUES (@name, @desc, @img, @s1, @s2, @s3, @s4)
    `
  );

  const defaultCardsTransaction = db.transaction((allCards) =>{
    for (const card of allCards) insertCardStmt.run(card);
  });

  defaultCardsTransaction(defaultCards);


  const winsTableStmt = db.prepare(
    `CREATE TABLE wins (
        winner_id INTEGER NOT NULL,
        loser_id INTEGER NOT NULL,
        time INTEGER NOT NULL,
      FOREIGN KEY (winner_id) REFERENCES cards(id)
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
      FOREIGN KEY (loser_id) REFERENCES cards(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
      PRIMARY KEY (winner_id, loser_id)
    )`
  );

  winsTableStmt.run();


  const reportTableStmt = db.prepare(
    `CREATE TABLE reports(
        id INTEGER NOT NULL PRIMARY KEY,
        card_id INTEGER NOT NULL,
        time INTEGER NOT NULL,
      FOREIGN KEY (card_id) REFERENCES cards(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    )`
  );

  reportTableStmt.run();

}


/**
 * Used to help produce prepared statements when using varargs and such
 * @param {str} templateStr - should be like `VERB whatever FROM idk WHERE value = (?)`, where argsList needs to go where the ? is.
 * @param {array} argsList list of arguments that will be entered into where the ? is.
 * @returns object of {success: bool, stmtString: str, bindDict: dict{int:any}, bindList:[argsList], message: str}.
 * Intended to be used like `db.prepare(stmtString).run(bindDict)` (but with some awaits ofc).
 * 'message' is an error message (only used in case of a fuckup)
 */
function varargs_prepared_statement_prepper(templateStr, argsList){
  let result = {
    success: false,
    statementString: templateStr,
    bindDict: {},
    bindList: argsList,
    message: ""
  };

  if (!templateStr.includes("?")){
    result.message = "You forgot the ? placeholder smh my head";
    return result;
  }
  else if (!argsList || argsList.length < 1){
    result.message = "no argsList?";
    return result;
  }

  try {

    if (argsList.length > 1){
      let placeholderList = [];
      for (let index = 0; index < argsList.length; index++) {
        placeholderList.push(`?`);
        result.bindDict[index] = argsList[index];
      }
      result.statementString = templateStr.replace("?", placeholderList.join(","));
    } else {
      result.bindDict = {1:argsList[0]};
      result.statementString = templateStr;
    }
    result.success = true;
  } catch (dbError){
    console.error(dbError);
  }
  return result;
}

/**
 * like the other one but less shit
 * @param {*} templateStr 
 * @param {*} argsList 
 * @returns object of { success: bool, statementString: str, bindList: [any], message: str }
 */
function varied_length_prepared_statement_prepper_v2(templateStr, argsList){
  let result = {
    success: false,
    statementString: templateStr,
    bindList: argsList,
    message: ""
  };
  if (!templateStr.includes("?")){
    result.message = "You forgot the ? placeholder smh my head";
    return result;
  }
  else if (!argsList || argsList.length < 1){
    result.message = "no argsList?";
    return result;
  }
  else if (argsList.length == 1){
    result.success = true;
    result.message = "1 arg, untouched";
    return result;
  }

  let placeholderList = [];
  for (let index = 0; index < argsList.length; index++) {
    placeholderList.push(`?`);
  }
  result.statementString = templateStr.replace("?", placeholderList.join(","));
  result.success = true;
  return result;
}

/**
 * Obtains the full details of the cards with the given IDs
 * @param {*} cId int
 * @returns object of {
 *     success: bool,
 *     entries:[
 *       {id: int, name: str, desc: str, img: str, stat1: int, stat2: int, stat3: int, stat4: int}
 *     ]
 *   } for those cards
 */
function getCards(...args) {

  console.log(args);

  let result = {success: false, entries: []};
  if ( !(args != false) || args.length == 0){
    result.message = "no args given!";
    return result;
  }

  const preppedStatement = varied_length_prepared_statement_prepper_v2(
    "SELECT id, name, desc, img, stat1, stat2, stat3, stat4 FROM cards "
    + "WHERE id IN (?)",
    args
  );

  if (!preppedStatement.success){
    console.log(`something fucked up! ${preppedStatement.message}`);
    result.message = preppedStatement.message;
    return result;
  }

  try {
    

    //const stmt = await db.prepare(preppedStatement.statementString);
    //result.entries = await stmt.run(preppedStatement.bindDict);

    let argList = [];

    for (let index = 0; index < args.length; index++) {
      const element = args[index];
      
      argList.push(element);
    }

    

    const stmt = db.prepare(preppedStatement.statementString);
    result.entries = stmt.all(preppedStatement.bindList);

    result.success = (result.entries != false);
  } catch (dbError){
    console.error(dbError);
  }
  return result;
}


/**
 * Obtains all card IDs from the database
 * @returns object of {success: bool, entries: [{id: int}] }
 */
function getCardIDs() {
  let result = {success: false, entries: []};
  try{
    const stmt = db.prepare("SELECT id FROM cards");
    result.entries = stmt.all();
    //console.log(`${result.entries}, ${result.entries != false}`);
    //result.entries = await db.all("SELECT id FROM cards");
    result.success = (result.entries != false);
  } catch (dbError){
    console.error(dbError);
  }
  return result;
}

/**
 * gets the IDs of n random cards, chosen randomly
 * @param {int} cardsToGet how many cards we want
 * @param {*} seed we're using for the RNG
 * @returns object of { success: bool, entries: [{id: int}], ids: []}
 */
function getRandomCardIDs(cardsToGet, seedToUse) {

  let result = {success: false, entries: []};//, ids: []};

  if (cardsToGet < 0){
    return result;
  } else if (cardsToGet == 0){
    result.success = true;
    return result;
  }

  const givenSeed = (seedToUse !== undefined && seedToUse != null && seedToUse != NaN);

  console.log(`${givenSeed}, ${seedToUse}`);

  result = getCardIDs();

  //console.log(result);

  if (result.success == false){
    return result;
  }

  let allEntries = result.entries;

  

  for(let ient = 0; ient < allEntries.length; ient++){
    console.log(allEntries[ient]);
  }


  if (givenSeed){
    let rng = random.clone(new seedrandom(seedToUse));
    
    cardsToGet = Math.max(Math.min(cardsToGet, allEntries.length), 0);

    var last = allEntries.length - 1;
    for (var index = 0; index < cardsToGet; index++){
      var rand = rng.integer(index, last);
      var temp = allEntries[index];
      allEntries[index] = allEntries[rand];
      allEntries[rand] = temp;
    }
    allEntries = allEntries.slice(0, cardsToGet);
  }
  else {

    allEntries = sample(allEntries, cardsToGet);
  }

  //console.log(`${allEntries}`);

  result.entries = allEntries;


  //let allEntries = result.entries;

  //result.entries = sample(result.entries, cardsToGet);

  

  return result;

}

/**
 * checks if the given cards actually exist
 * @param  {...any} ids IDs of cards we want to verify the existence of
 * @returns object of {
 *  success: bool,
 *  exists: [int - IDs of all given IDs that exist],
 *  all_exist: bool, 
 *  message: "" 
 *  }
 */
function checkIfCardsExist(...ids){

  let result = {success: false, exists: [], all_exist: false, message: ""};

  if (ids.length == 0){
    // technically the truth.
    result.message = "all 0 of these IDs exist, but why would you want to check that?";
    result.success = true;
    result.all_exist = false;
    return result;
  }

  

  try {

    let notFoundSet = new Set();

    for (let index = 0; index < ids.length; index++) {
      notFoundSet.add(ids[index]);
    }

    const prepped = varied_length_prepared_statement_prepper_v2(
      `SELECT id FROM cards WHERE id IN (?)`,
      ids
    );

    const stmt = db.prepare(prepped.statementString);

    const outcome = stmt.all(prepped.bindList);

    console.log(outcome);

    let exList = [];
    for(const itm of outcome){
      exList.push(itm.id);
      notFoundSet.delete(itm.id);
    }

    result.exists = exList;
    result.all_exist = notFoundSet.size == 0;
    result.success = true;

  } catch (error){
    console.log(error);
    result.message = "error when querying database when checking if they exist";
    result.success = false;
    result.all_exist = false;
  }

  return result;

}

/**
 * get number of cards in the cards table
 * @returns object of { success: bool, cards: int }
 */
function getCardCount(){

  let result = {success: false, cards: NaN };

  try {
    result.cards = db.prepare("SELECT count(id) FROM cards").pluck().get();
    result.success = (result.cards != NaN);
  } catch (dbError){
    console.error(dbError);
  }
  return result;
}


/**
   * Obtains all info about all cards from the database
   * @returns object of {
   *     success: bool,
   *     entries:[
   *       {id: int, name: str, desc: str, img: str, stat1: int, stat2: int, stat3: int, stat4: int}
   *     ]
   *   }
   * with data for all cards
   */
function getAllCards() {
  let result = {success: false, entries: []};
  try {
    const stmt = db.prepare("SELECT id, name, desc, img, stat1, stat2, stat3, stat4 FROM cards");
    result.entries = stmt.all();
    //result.entries = await db.all("SELECT id, name, desc, img, stat1, stat2, stat3, stat4 FROM cards");
    result.success = (result.entries != false);
  } catch (dbError){
    console.error(dbError);
  }
  return result;
}

/**
   * obtains all card IDs from the database except the specified cards
   * @param {*} args  all card IDs to exclude
   * @returns object of {success: bool, entries: [{id: int}] } with data for all cards except the ones with specified IDs
   */
function getCardIDsExcept(...args) {
  let result = {success: false, entries: []};
  if (!args || args.length == 0){
    return getCards();
  }

  const preppedStatement = varargs_prepared_statement_prepper(
    "SELECT id FROM cards WHERE id NOT IN (?)",
    args
  );

  if (!preppedStatement.success){
    console.log(`something fucked up! ${preppedStatement.message}`);
    result.message = preppedStatement.message;
    return result;
  }

  try {
    /*
    let stmtString = "SELECT id FROM cards WHERE id NOT IN (?)";
    let bindDict = {};

    if (args.length > 1){
      let placeholderList = [];
      for (let index = 0; index < args.length; index++) {
        placeholderList.push(`?${index}`);
        bindDict[index] = args[index];
      }
      stmtString = stmtString.replace("?", placeholderList.join(","));
    } else {
      bindDict = {1:args[0]};
    }
    */

    //const stmt = await db.prepare(preppedStatement.statementString);
    //result.entries = await stmt.run(preppedStatement.bindDict);

    const stmt = db.prepare(preppedStatement.statementString);
    result.entries = stmt.all(...preppedStatement.bindList);

    result.success = (result.entries != false);
  } catch (dbError){
    console.error(dbError);
  }
  return result;

}

/**
   * Obtains the full details of the card with that ID
   * @param {*} cId int
   * @returns object of {
   *     success: bool,
   *     card:{id: int, name: str, desc: str, img: str, stat1: int, stat2: int, stat3: int, stat4: int}
   *   } for that card
   */
function getCard(cId) {

  let result = {success: false, card: {}, card_exists: false};
  try{
    const stmt = db.prepare(
      "SELECT id, name, desc, img, stat1, stat2, stat3, stat4 FROM cards "
      + " WHERE id = ?"
    );
    //await stmt.bind({1: cId});
    result.card = stmt.get(cId);
    result.card_exists = (result.card != {});
    result.success = true;
  } catch (dbError){
    console.error(dbError);
    
  };
  return result;
}

/**
   * Attempts to find wins data for cards card1 and card2
   * @param {*} card1 ID for first card
   * @param {*} card2 ID for other card
   * @returns object of {
   *    success:bool,
   *    win_data_exists: bool,
   *    entries: [{time: int, winner_id: int, loser_id: int}]
   * }
   */
function getWinData(card1, card2) {
  let result = {success: false, win_data_exists: false, entries: []};
  
  try {

    


    const stmt = db.prepare(
      "SELECT * FROM wins WHERE"
      + " (winner_id = @c1 AND loser_id = @c2) "
      + " OR "
      + " (winner_id = @c2 AND loser_id = @c1) "
    );
    result.entries =  stmt.all(
      {"c1" : card1, "c2": card2}
    );

    result.success = result.entries.length >= 0;
    result.win_data_exists = result.entries.length > 0;

    return result;

  } catch (dbError){
    console.error(dbError);
    return result;
  }
}

/**
   * Attempts to set the win data when the card 'winner' beats the card 'loser'
   * @param {*} winner ID of winning card
   * @param {*} loser ID of losing card
   * @returns object of {success: bool, existsAlready: bool, message: str, when: int }
   */
function setWinData(winner, loser) {
  let result = {success: false, existsAlready: false, message: "", when: 0};
  try {
    

    if (winner == null){
      result.message = "why is winner null???"; 
      return result;
    }
    else if (loser == null){
      result.message = "why is loser null???";
      return result;
    }
    try{
      winner = parseInt(winner);
      loser = parseInt(loser);
    } catch (parseError){
      result.message = `one or both of winner (${winner}) and loser (${loser}) aren't numbers >:(`;
      return result;
    }

    if (winner == loser){
      result.message = `You are not allowed to record card ${winner} beating itself up smh my head`;
    }

    {
      const existCheck = checkIfCardsExist(winner, loser);
      
      if (!existCheck.success){
        result.message = `Unable to check if cards ${winner} and ${loser} exist!`;
        return result;
      }
      else if (!existCheck.all_exist){
        result.message = `Out of the given cards [${winner},${loser}], only cards [${existCheck.exists.join(",")}] actually exist.`;
        return result;
      }

    }

    try {
      // first things first, we check that we don't already have a recorded outcome.
      const stmt1 = db.prepare(
        "SELECT * FROM wins WHERE"
        + " (winner_id = @c1 AND loser_id = @c2) "
        + " OR "
        + " (winner_id = @c2 AND loser_id = @c1) "
      );
      const result1 = stmt1.all(
        {"c1" : winner, "c2": loser}
      );

      if (result1.length != 0){
        result.existsAlready = true;
        result.success = true;
        return result;
      }
    } catch (dbError){
      console.error(dbError);
    }

    const stmt2 = db.prepare(
      "INSERT INTO wins (winner_id, loser_id, time) VALUES (@win, @lose, @t)"
    );
    const t = Date.now();
    const res = stmt2.run(
      {
        "win": winner,
        "lose":loser,
        "t":t
      }
    );
    result.success = res.changes > 0;
    result.when = t;
    return result;

  } catch (dbError){
    console.error(dbError);
    return result;
  }
}


/**
   * Attempts to add new card to database
   * @param {*} cardName str
   * @param {*} cardDesc str
   * @param {*} cardImg str
   * @param {*} s1 int
   * @param {*} s2 int
   * @param {*} s3 int
   * @param {*} s4 int
   * @returns object of {success: bool, cardID: int, message: string}
   */
async function addCard(cardName, cardDesc, cardImg, s1, s2, s3, s4) {

  let result = {success: false, cardID: -1, message: ""};

  let statsArray = [s1, s2, s3, s4];
  //console.log(statsArray);
  let statTotal = 0;
  for (let i = 0; i < statsArray.length; i++) {
    let s = statsArray[i];
    
    if (s == null || s < card_consts.card_stat_min){
      s = card_consts.card_stat_min;
    } else if (s > card_consts.card_stat_max){
      s = card_consts.card_stat_max;
    }

    var nextTempTotal = statTotal + s;

    if (i == statsArray.length - 1){
      var totalDiff = nextTempTotal - card_consts.card_stat_total_max;
      if (totalDiff > 0)
      {
        s -= totalDiff;
      }
    }
    else {

      var remaining  = (statsArray.length - 1- i);

      var totalLeewayDiff = nextTempTotal - remaining - card_consts.card_stat_total_max;

      if (totalLeewayDiff > 0){
        s -= totalLeewayDiff;
      }
    }

    statsArray[i] = s;
    statTotal += s;
  }

  s1 = statsArray[0];
  s2 = statsArray[1];
  s3 = statsArray[2];
  s4 = statsArray[3];


  if (cardName == null || cardName.trim() === "")
  {
    result.message = "Please give your card a name.";
    return result;
  }
  cardName = cardName.trim();

  cardName = cardName.replace(/((\r)?\n)+/g, " ");

  cardName = cardName.substring(0, card_consts.card_name_length);

  if (filtering.string_contains_bad_words(cardName))
  {
    result.message = "bad title - watch your fecking language!";
    return result;
  }

  if (cardDesc == null)
  {
    cardDesc = "";
  }

  cardDesc= cardDesc.replace(/((\r)?\n)+/g, " ");

  cardDesc = cardDesc.trim();

  cardDesc = cardDesc.substring(0, card_consts.card_desc_length);

  if (filtering.string_contains_bad_words(cardDesc))
  {
    result.message = "bad description - watch your fecking language!";
    return result;
  }

  if (cardImg == null){
    cardImg = "";
  }

  cardImg = cardImg.trim();

  cardImg = cardImg.substring(0, cardImg.card_img_url_length);
  
  cardImg = await filtering.to_image_url(cardImg);


  try {


    const stmt = db.prepare(
      "INSERT INTO cards(name, desc, img, stat1, stat2, stat3, stat4) "
      +" VALUES (@n, @d, @i, @s1, @s2, @s3, @s4)"
    );

    let run = stmt.run(
      {
        "n": cardName,
        'd': cardDesc,
        'i': cardImg,
        's1': s1,
        's2': s2,
        "s3": s3,
        "s4": s4
      }
    );
    
    //result.cardID = run.lastID;
    //result.success = true;
    //result.message = `Added card ${cardName} to the cards database!`;

    if (run.changes > 0){
      result.cardID = run.lastInsertRowid;
      result.success = true;
      result.message = `Added card ${cardName} to the cards database!`;
    }
    else{
      result.success = false;
      result.message = "unable to add card to database!";
    }

    

    return result;

  } catch(dbError){
    result.message = `Database error when trying to add card! ${dbError}`;
    return result;
  }


}

/**
   * Attempts to add new card to database, and records the card it beats and the one it loses to
   * @param {str} cardName str
   * @param {str} cardDesc str
   * @param {str} cardImg str
   * @param {int} s1 int
   * @param {int} s2 int
   * @param {int} s3 int
   * @param {int} s4 int
   * @param {int} cardItBeats ID of the card it beats
   * @param {int} cardItLosesTo ID of the card it loses to
   * @returns object of {success: bool, cardID: int, message: string}
   */
async function addCardForm(
  cardName, cardDesc, cardImg, s1, s2, s3, s4,
  cardItBeats,
  cardItLosesTo
){


  let result = {success: false, cardID: -1, message: ""};

  if (cardItBeats == null || cardItLosesTo == null) {
    result.message = "you forgot to declare the IDs of the two cards which this new card beats/loses to";
    return result;
  } else if (cardItBeats == cardItLosesTo){
    result.message = `cardItBeats and cardItLoses to need to be different values. They can't both have the value of ${cardItBeats}`;
  } else {
    const othersExistResult = checkIfCardsExist(cardItBeats, cardItLosesTo);

    if (!othersExistResult.success){
      result.message = `unable to check if cards ${cardItBeats} and ${cardItLosesTo} exist.`;
      return result;
    } else if (!othersExistResult.all_exist) {

      result.message = `given cards: [${cardItBeats}, ${cardItLosesTo}]. However, only cards [${othersExistResult.exists.join(",")}] actually exist`;
      return result;
    }
  }

  let statsArray = [s1, s2, s3, s4];

  //console.log(statsArray);
  let statTotal = 0;
  for (let i = 0; i < statsArray.length; i++) {
    //console.log(`start iteration ${i} stats ${statsArray} total ${statTotal}`)
    let s = statsArray[i];
    
    if (s == null || s < card_consts.card_stat_min){
      s = card_consts.card_stat_min;
    } else if (s > card_consts.card_stat_max){
      s = card_consts.card_stat_max;
    }

    var nextTempTotal = statTotal + s;
    //console.log(`nextTempTotal ${nextTempTotal}`)

    if (i == statsArray.length - 1){
      var totalDiff = nextTempTotal - card_consts.card_stat_total_max;
      if (totalDiff > 0)
      {
        s -= totalDiff;
      }
    }
    else {

      var remaining  = (statsArray.length - 1- i);

      var totalLeewayDiff = nextTempTotal - remaining - card_consts.card_stat_total_max;

      if (totalLeewayDiff > 0){
        s -= totalLeewayDiff;
      }
    }

    statsArray[i] = s;
    statTotal += s;
    //console.log(`end iteration ${i} stats ${statsArray} total ${statTotal}`)
  }

  //console.log(statsArray);

  s1 = statsArray[0];
  s2 = statsArray[1];
  s3 = statsArray[2];
  s4 = statsArray[3];


  if (cardName == null || cardName.trim() === "")
  {
    result.message = "Please give your card a name.";
    return result;
  }
  cardName = cardName.trim();

  cardName = cardName.replace(/((\r)?\n)+/g, " ");

  cardName = cardName.substring(0, card_consts.card_name_length);

  if (filtering.string_contains_bad_words(cardName))
  {
    result.message = "bad title - watch your fecking language!";
    return result;
  }

  if (cardDesc == null)
  {
    cardDesc = "";
  }

  cardDesc= cardDesc.replace(/((\r)?\n)+/g, " ");

  cardDesc = cardDesc.trim();

  cardDesc = cardDesc.substring(0, card_consts.card_desc_length);

  if (filtering.string_contains_bad_words(cardDesc))
  {
    result.message = "bad description - watch your fecking language!";
    return result;
  }

  if (cardImg == null){
    cardImg = "";
  }

  cardImg = cardImg.trim();

  cardImg = cardImg.substring(0, cardImg.card_img_url_length);
  
  cardImg = await filtering.to_image_url(cardImg);


  try {

    let tempResult = {success: false, newCardID: 0};

    try{

      
      const cardInStmt = db.prepare(
        `INSERT INTO cards(name, desc, img, stat1, stat2, stat3, stat4)
          VALUES (@na, @de, @im, @st1, @st2, @st3, @st4)`
      );

      let innerTransRes = cardInStmt.run({
        na: cardName,
        de: cardDesc,
        im: cardImg,
        st1: s1,
        st2: s2,
        st3: s3,
        st4: s4
      });

      if (innerTransRes.changes < 0){
        throw error("command to add the new card failed!");
      } else {
        tempResult.newCardID = innerTransRes.lastInsertRowid;
        tempResult.success = true;
        result.cardID = tempResult.newCardID;
      }

      let _newCardID = innerTransRes.lastInsertRowid;

      result.cardID = _newCardID;
      //console.log(_newCardID);

      const winsInStmt = db.prepare(
        `INSERT INTO wins (winner_id, loser_id, time) VALUES (@win, @lose, @t)`
      );

      innerTransRes = winsInStmt.run({
        win: _newCardID,
        lose: cardItBeats,
        t: Date.now()
      });

      if (innerTransRes.changes < 0){
        throw "command to add the card it beats failed!";
      }

      innerTransRes = winsInStmt.run({
        win: cardItLosesTo,
        lose: _newCardID,
        t: Date.now()
      });
      
      if (innerTransRes.changes < 0){
        throw "command to add the card it loses to failed!";
      }

      result.success = true;
      result.cardID = tempResult.newCardID;
      result.message = `Added card ${cardName} to the cards database (ID ${result.cardID})!`;
      
      
      

    } catch (err){
      result.success = true;
      result.message = err;
    }

    return result;

  } catch(dbError){
    result.success = false;
    result.message = `Database error when trying to add card! ${dbError}`;
    return result;
  }

}


/**
 * allows a card to be reported
 * @param {*} cardId ID of the card being reported
 */
function reportThisCard(cardId){
    

  let result = {success: false, message: ""};

  {
    let existCheck = checkIfCardsExist(cardId);
    if (!existCheck.success){
      result.message = existCheck.message;
      return result;
    }
    else if (!existCheck.all_exist){
      result.message = `The card with ID ${cardId} doesn't exist.`;
      return result;
    }
  }

  try{
    const stmt = db.prepare(
      "INSERT INTO reports(card_id, time) VALUES (@id, @time)"
    );
    const dbResult = stmt.run(
      {
        id: cardId,
        time: Date.now()
      }
    );
    //console.log(dbResult);

    result.success = (dbResult.changes > 0);
    result.message = (result.success) ? 
      `Reported card ${cardId}, report ID ${dbResult.lastInsertRowid}`:
      `Unable to successfully add report for ${cardId} to database!`;

  } catch (dbError) {
    console.error(dbError);
    result.success = false;
    result.message = `error inserting report for card ${cardId} into database!`;
  }
  return result;
}

/**
   * Attempts to delete a specified card from the database.
   * TODO: ensure that this can only be called from admin panel or something
   * @param {*} id 
   * @returns true if it could be deleted or not
   */
async function deleteCard(id) {
  let success = false;
  try {
    const stmt = db.prepare("DELETE FROM cards WHERE id = ?");
    //success = await db.run("DELETE FROM cards WHERE id = ?", id);
    const result = stmt.run(id);
    success = (result.changes > 0);
    //console.log(result);
  } catch (dbError) {
    console.error(dbError);
  }
  return success;
}

/**
   * attempts to obtain all info from all reports
   * TODO: ensure that this can only be called from admin panel or something
   * @returns 
   */
function getReports() {
    
  let result = {success: false, entries: []};
  try {
    const stmt = db.prepare("SELECT * FROM reports");
    result.entries = stmt.all();

    result.success = (result.entries != false || result.entries.length >= 0);
    //result.entries = await db.all("SELECT * FROM reports");
    //result.success = true;
  } catch (dbError){
    console.error(dbError);
  }
  return result;

}

/**
   * attempts to get IDs of all reports.
   * TODO: ensure that this can only be called from admin panel or something
   * @returns IDs from all reports
   */
function getReportIds() {

  let result = {success: false, entries: []};
  try {
    const stmt = db.prepare("SELECT id FROM reports");
    result.entries = stmt.all();

    result.success = (result.entries != false || result.entries.length >= 0);
    //result.entries = await db.all("SELECT id FROM reports");
    //result.success = true;
  } catch (dbError){
    console.error(dbError);
  }
  return result;
}

/**
 * attempts to get full details about the given report
 * TODO: ensure that this can only be called from admin panel or something
 * @param {*} reportID ID of the report we want to view
 * @returns full details for the given report
 */
function getReport(reportID) {
  let result = {success: false, data: {}};
  try {

    const stmt = db.prepare("SELECT * FROM reports WHERE id = ?");
    //success = await db.run("SELECT * FROM reports WHERE id = ?"", reportID);
    result.entries = stmt.all(reportID);
    success = (result.entries != false || result.entries.length > 0);
    //console.log(result);

    //result.data = await db.all("SELECT * FROM reports WHERE id = ?",reportID);
    //result.success = true;

  } catch (dbError){
    console.error(dbError);
  }
  return result;
}


/**
 * attempts to delete the given report
 * TODO: ensure that this can only be called from admin panel or something
 * @param {*} reportID ID of the report we want to delete
 * @returns outcome of deletion attempt
 */
function deleteReport(reportId) {
  let success = false;
  try {

    const stmt = db.prepare("DELETE FROM reports WHERE id = ?");

    const result = stmt.run(reportId);
    success = (result.changes > 0);
    //console.log(result);
    //success = await db.run("DELETE FROM reports WHERE id = ?", reportId);
    
  } catch (dbError) {
    console.error(dbError);
    return false;
  }
  return success.changes > 0 ? true : false;
}

/**
   * attempts to delete ALL reports for a given card
   * TODO: ensure that this can only be called from admin panel or something
   * @param {*} cardId ID of the card we want to dismiss all reports from
   * @returns true if we managed to delete them
   */
function deleteReportsForCard(cardId) {
  let success = false;
  try {
    //success = await db.run("DELETE FROM reports WHERE card_id = ?", cardId);
    //console.log(success);
    const stmt = db.prepare("DELETE FROM reports WHERE card_id = ?");

    const result = stmt.run(cardId);
    success = (result.changes > 0);
    //console.log(result);
  } catch (dbError) {
    console.error(dbError);
    return false;
  }
  return success.changes > 0 ? true : false;
}

/**
   * gets full details about n random cards.
   * @param {int} cardsToGet how many cards we want 
   * @param {*} seedToUse seed we're using for the RNG
   * @returns object of 
   *   {
   *     success: bool,
   *     entries:[{id: int, name: str, desc: str, img: str, stat1: int, stat2: int, stat3: int, stat4: int}]
   *   }
   */
function getRandomCards(cardsToGet, seedToUse) {

  let result = {success: false, entries: []};

  if (cardsToGet < 0){
    return result;
  } else if (cardsToGet == 0){
    result.success = true;
    return result;
  }

  if (seedToUse === undefined){
    seedToUse = null
  }

  const idResult = getRandomCardIDs(cardsToGet, seedToUse);

  //console.log(idResult);

  if (!idResult.success){
    return result;
  }
  
  const idLength = idResult.entries.length;
  let idList = [];
  for (let index = 0; index < idLength; index ++){
    const entry = idResult.entries[index];
    //console.log(`${entry} ${entry.id}`);
    idList.push(entry.id);
  }

  //console.log(`${idsList}`);

  const getResult = getCards(...idList);

  if (!getResult.success){
    return result;
  }

  for(const entry of getResult.entries){
    console.log(`${entry}, ${entry.id}`);
  }
  
  const ordered = idList.map(
    (currentID) => {
      return getResult.entries.find(
        (entry) => entry.id == currentID
      )
    }
  );

  result.success = true;
  result.entries = ordered;

  return result;

}



/**
 * Will attempt to run a backup of the database
 * @returns object of {success: bool, message: str}
 */
function runBackup(){


  throw "Not yet implemented!";

  let result = {success: false, message: "not yet implemented!"};

  if (_backup_running){
    result.message = "please wait for the current backup to end smh my head"
    return result;
  }


  return result;


}





export {

  //db,

  getAllCards,
  getCardCount,
  getCardIDs,
  getCards,
  getCardIDsExcept,
  getCard,
  getWinData,
  setWinData,
  addCard,
  addCardForm,
  reportThisCard,
  deleteCard,
  getReports,
  getReportIds,
  getReport,

  deleteReport,
  deleteReportsForCard,

  getRandomCardIDs,

  getRandomCards,
  checkIfCardsExist,

  
}


