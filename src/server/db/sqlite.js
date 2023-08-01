/**
 * Module handles database management
 *
 * The sample data is for a chat log with one table:
 * Messages: id + message text
 */


const fs = require("fs");
const dbFile = "./.data/cards.db";
const exists = fs.existsSync(dbFile);

const {
  card_consts,
  filtering
} = require('../constants.js');
const e = require("express");

const {
  sample
} = require("underscore");


//https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
/**
 * The better-sqlite3 database object
 * see https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
 */
const db =require(
  "better-sqlite3"
)(
  dbFile,
  {
    "verbose": console.log
  }
);

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
async function _getCards(...args) {

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
function _getCardIDs() {
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
 * @returns object of { success: bool, entries: [{id: int}]}
 */
function _getRandomCardIDs(cardsToGet) {

  let result = {success: false, entries: []};

  if (cardsToGet < 0){
    return result;
  } else if (cardsToGet == 0){
    result.success = true;
    return result;
  }

  result = _getCardIDs();

  //console.log(result);

  if (result.success == false){
    return result;
  }

  result.entries = sample(result.entries, cardsToGet);

  return result;

}

function _checkIfCardsExist(...ids){

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
function _cardCount(){

  let result = {success: false, cards: NaN };

  try {
    result.cards = db.prepare("SELECT count(id) FROM cards").pluck().get();
    result.success = (result.cards != NaN);
  } catch (dbError){
    console.error(dbError);
  }
  return result;
}


// Server script calls these methods to connect to the db
module.exports = {


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
  getAllCards: async() => {
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
  },


  /**
   * Obtains all card IDs from the database
   * @returns object of {success: bool, entries: [{id: int}] }
   */
  getCardIDs: async() => {
    return _getCardIDs();
  },

  /**
   * get number of cards in the cards table
   * @returns object of { success: bool, cards: int }
   */
  getCardCount: function() {
    return _cardCount();
  },

  /**
   * obtains all card IDs from the database except the specified cards
   * @param {*} args  all card IDs to exclude
   * @returns object of {success: bool, entries: [{id: int}] } with data for all cards except the ones with specified IDs
   */
  getCardIDsExcept: async(...args) => {
    let result = {success: false, entries: []};
    if (!args || args.length == 0){
      return await _getCards();
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

  },

  /**
   * Obtains the full details of the card with that ID
   * @param {*} cId int
   * @returns object of {
   *     success: bool,
   *     card:{id: int, name: str, desc: str, img: str, stat1: int, stat2: int, stat3: int, stat4: int}
   *   } for that card
   */
  getCard: async(cId) => {

    let result = {success: false, card: {}};
    try{
      const stmt = db.prepare(
        "SELECT id, name, desc, img, stat1, stat2, stat3, stat4 FROM cards "
        + " WHERE id = ?"
      );
      //await stmt.bind({1: cId});
      result.card = stmt.get(cId);
      result.success = (result.entries != false);
    } catch (dbError){
      console.error(dbError);
      
    };
    return result;
  },

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
  getCards: async(...args) => {
    return await _getCards(...args);
  },

  /**
   * Attempts to find wins data for cards card1 and card2
   * @param {*} card1 ID for first card
   * @param {*} card2 ID for other card
   * @returns object of {success:bool, entries: [{"time": int, "winner_id": int, "loser_id": int}]}
   */
  getWinData: async(card1, card2) => {
    let result = {success: false, entries: []};
    
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

      result.success = (result.entries != false || result.entries.length >= 0);

      return result;

    } catch (dbError){
      console.error(dbError);
      return result;
    }
  },


  /**
   * Attempts to set the win data when the card 'winner' beats the card 'loser'
   * @param {*} winner ID of winning card
   * @param {*} loser ID of losing card
   * @returns object of {success: bool, existsAlready: bool }
   */
  setWinData: async(winner, loser) => {
    let result = {success: false, existsAlready: false, message: ""};
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
        const existCheck = _checkIfCardsExist(winner, loser);
        
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
      const res = stmt2.run(
        {
          "win": winner,
          "lose":loser,
          "t":Date.now()
        }
      );
      result.success = res.changes > 0;
      return result;

    } catch (dbError){
      console.error(dbError);
      return result;
    }
  },


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
  addCard: async (cardName, cardDesc, cardImg, s1, s2, s3, s4) => {

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


  },

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
  addCardForm: async(
    cardName, cardDesc, cardImg, s1, s2, s3, s4,
    cardItBeats,
    cardItLosesTo
  ) => {


    let result = {success: false, cardID: -1, message: ""};

    if (cardItBeats == null || cardItLosesTo == null) {
      result.message = "you forgot to declare the IDs of the two cards which this new card beats/loses to";
      return result;
    } else if (cardItBeats == cardItLosesTo){
      result.message = `cardItBeats and cardItLoses to need to be different values. They can't both have the value of ${cardItBeats}`;
    } else {
      const othersExistResult = _checkIfCardsExist(cardItBeats, cardItLosesTo);

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

  },

  /**
   * allows a card to be reported
   * @param {*} cardId ID of the card being reported
   */
  reportThisCard: function(cardId){
    

    let result = {success: false, message: ""};

    {
      let existCheck = _checkIfCardsExist(cardId);
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
  },

  /**
   * Attempts to delete a specified card from the database.
   * TODO: ensure that this can only be called from admin panel or something
   * @param {*} id 
   * @returns true if it could be deleted or not
   */
  deleteCard: async (id) => {
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
  },

  /**
   * attempts to obtain all info from all reports
   * TODO: ensure that this can only be called from admin panel or something
   * @returns 
   */
  getReports: async() => {
    
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
  
  },

  /**
   * attempts to get IDs of all reports.
   * TODO: ensure that this can only be called from admin panel or something
   * @returns IDs from all reports
   */
  getReportIds: async() => {

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
  },

  /**
   * attempts to get full details about the given report
   * TODO: ensure that this can only be called from admin panel or something
   * @param {*} reportID ID of the report we want to view
   * @returns full details for the given report
   */
  getReport: async(reportID) => {
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
  },

  /**
   * attempts to delete the given report
   * TODO: ensure that this can only be called from admin panel or something
   * @param {*} reportID ID of the report we want to delete
   * @returns outcome of deletion attempt
   */
  deleteReport: async(reportId) => {
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
  },

  /**
   * attempts to delete ALL reports for a given card
   * TODO: ensure that this can only be called from admin panel or something
   * @param {*} cardId ID of the card we want to dismiss all reports from
   * @returns true if we managed to delete them
   */
  deleteReportsForCard: async(cardId) => {
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
  },


  /**
   * gets the IDs of n random cards, chosen randomly
   * @param {int} cardsToGet how many cards we want
   * @returns object of { success: bool, entries: [{id: int}]}
   */
  getRandomCardIDs: (cardsToGet) => {

    return _getRandomCardIDs(cardsToGet);

  },

  /**
   * gets full details about n random cards.
   * @param {int} cardsToGet how many cards we want 
   * @returns object of 
   *   {
   *     success: bool,
   *     entries:[{id: int, name: str, desc: str, img: str, stat1: int, stat2: int, stat3: int, stat4: int}]
   *   }
   */
  getRandomCards: async(cardsToGet) => {

    let result = {success: false, entries: []};

    if (cardsToGet < 0){
      return result;
    } else if (cardsToGet == 0){
      result.success = true;
      return result;
    }

    const idResult = _getRandomCardIDs(cardsToGet);

    //console.log(idResult);

    if (idResult.success == false){
      return result;
    }

    let idsList = [];
    for (const entry of idResult.entries){
      //console.log(`${entry} ${entry.id}`);
      idsList.push(entry.id);
    }

    //console.log(`${idsList}`);

    result = await _getCards(...idsList);

    //console.log(result);

    return result;

  }


  
};
