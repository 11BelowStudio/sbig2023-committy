/**
 * Module handles database management
 *
 * The sample data is for a chat log with one table:
 * Messages: id + message text
 */


const fs = require("fs");
const dbFile = "./.data/cards.db";
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const dbWrapper = require("sqlite");
const casual = require("casual");

const {
  card_consts,
  filtering
} = require('./constants.js')

let db;




//SQLite wrapper for async / await connections https://www.npmjs.com/package/sqlite
dbWrapper
  .open({
    filename: dbFile,
    driver: sqlite3.Database
  })
  .then(async dBase => {
    db = dBase;

    try {
      if (!exists) {

        await db.run(
          "CREATE TABLE cards ("
            + " id INTEGER NOT NULL PRIMARY KEY,"
            + " name TEXT NOT NULL,"
            + " desc TEXT NOT NULL,"
            + " img TEXT NOT NULL,"
            + " stat1 INTEGER NOT NULL DEFAULT 1,"
            + " stat2 INTEGER NOT NULL DEFAULT 1,"
            + " stat3 INTEGER NOT NULL DEFAULT 1,"
            + " stat4 INTEGER NOT NULL DEFAULT 1,"
          + " CHECK (length(name) > 0) "
          +")"
        );

        await db.run(
          "CREATE TABLE wins ("
            + "winner_id INTEGER NOT NULL,"
            + "loser_id INTEGER NOT NULL,"
            + "time INTEGER NOT NULL,"
            + "FOREIGN KEY (winner_id) REFERENCES cards(id)"
              + " ON DELETE CASCADE"
              + " ON UPDATE CASCADE,"
            + "FOREIGN KEY (loser_id) REFERENCES cards(id)"
              + " ON DELETE CASCADE"
              + " ON UPDATE CASCADE,"
            + "PRIMARY KEY (winner_id, loser_id)"
          + ")"
        );

        await db.run(
          "CREATE TABLE reports("
          + " id INTEGER NOT NULL PRIMARY KEY,"
          + " card_id INTEGER NOT NULL,"
          + " time INTEGER NOT NULL,"
          + " FOREIGN KEY (card_id) REFERENCES cards(id)"
            + " ON DELETE CASCADE"
            + " ON UPDATE CASCADE"
          +")"
        );


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
        ]

        const defaultCardStmt = await db.prepare(
          "INSERT INTO cards(name, desc, img, stat1, stat2, stat3, stat4) "
          +" VALUES (@n, @d, @i, @s1, @s2, @s3, @s4)"
        );

        for (const c of defaultCards){
          let res = await defaultCardStmt.run(
            {
              "@n": c.name,
              '@d': c.desc,
              '@i': c.img,
              '@s1': c.s1,
              '@s2': c.s2,
              "@s3": c.s3,
              "@s4": c.s4
            }
          );
          console.log(res);
        }

        /*
        await db.run(
          "CREATE TABLE Messages (id INTEGER PRIMARY KEY AUTOINCREMENT, message TEXT)"
        );
        for (let r = 0; r < 5; r++)
          await db.run(
            "INSERT INTO Messages (message) VALUES (?)",
            casual.catch_phrase
          );
        */
      }
      console.log(await db.all("SELECT * from cards"));
    } catch (dbError) {
      console.error(dbError);
    }
  });

// Server script calls these methods to connect to the db
module.exports = {


  /**
   * Obtains all info about all cards from the database
   * @returns 
   */
  getCards: async() => {
    try {
      return await db.all("SELECT id, name, desc, img, stat1, stat2, stat3, stat4 FROM cards");
    } catch (dbError){
      console.error(dbError);
      return [];
    }
  },


  /**
   * Obtains all card IDs from the database
   * @returns 
   */
  getCardIDs: async() => {
    try{
      return await db.all("SELECT id FROM cards");
    } catch (dbError){
      console.error(dbError);
      return [];
    }
  },

  /**
   * Obtains the full details of the card with that ID
   * @param {*} cId int
   * @returns object of \{ id: int, name: str, desc: str, img: str, stat1: int, stat2: int, stat3: int, stat4: int } for that card
   */
  getCard: async(cId) => {
    try{
      const stmt = await db.prepare(
        "SELECT id, name, desc, img, stat1, stat2, stat3, stat4 FROM cards "
        + " WHERE id = ?"
      );
      await stmt.bind({1: cId});
      return await stmt.get();
    } catch (dbError){
      console.error(dbError);
      return {
        id: cId,
        name: "ERROR",
        desc: "ERROR",
        img: "ERROR",
        stat1: -1,
        stat2: -1,
        stat3: -1,
        stat4: -1
      }
    };
  },

  /**
   * Attempts to find wins data for cards card1 and card2
   * @param {*} card1 ID for first card
   * @param {*} card2 ID for other card
   * @returns object of {success:bool, entries: [{time: int, winner_id: int, loser_id: int}]}
   */
  getWinData: async(card1, card2) => {
    let result = {success: false, entries: []};
    
    try {
      const stmt = await db.prepare(
        "SELECT * FROM wins WHERE"
        + " (winner_id = @c1 AND loser_id = @c2) "
        + " OR "
        + " (winner_id = @c2 AND loser_id = @c1) "
      );
      result.entries = await stmt.all(
        {"@c1" : card1, "@c2": card2}
      );

      result.success = true;

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
    let result = {success: false, existsAlready: false};
    try {
      

      if (winner == null){
        console.log("why is winner null???"); 
      }
      if (loser == null){
        console.log("why is loser null???");
      }

      try {
        // first things first, we check that we don't already have a recorded outcome.
        const stmt1 = await db.prepare(
          "SELECT * FROM wins WHERE"
          + " (winner_id = @c1 AND loser_id = @c2) "
          + " OR "
          + " (winner_id = @c2 AND loser_id = @c1) "
        );
        const result1 = await stmt1.all(
          {"@c1" : winner, "@c2": loser}
        );

        if (result1.length != 0){
          result.existsAlready = true;
          return result;
        }
      } catch (dbError){
        console.error(dbError);
      }

      const stmt2 = await db.prepare(
        "INSERT INTO wins (winner_id, loser_id, time) VALUES (@win, @lose, @t)"
      );
      const res = await stmt2.run(
        {
          "@win": winner,
          "@lose":loser,
          "@t":Date.now()
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
    let statTotal = 0;
    for (let i = 0; i < statsArray.length; i++) {
      const s = statsArray[i];
      
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

    cardName = cardName.replace(/(\r)?\n/g, " ");

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

    cardDesc= cardDesc.replace(/(\r)?\n/g, " ");

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


      const stmt = await db.prepare(
        "INSERT INTO cards(name, desc, img, stat1, stat2, stat3, stat4) "
        +" VALUES (@n, @d, @i, @s1, @s2, @s3, @s4)"
      );

      let run = await stmt.run(
        {
          "@n": cardName,
          '@d': cardDesc,
          '@i': cardImg,
          '@s1': s1,
          '@s2': s2,
          "@s3": s3,
          "@s4": s4
        }
      );

      result.cardID = run.lastID;
      result.success = true;
      result.message = `Added card ${cardName} to the cards database!`;

      return result;

    } catch(dbError){
      result.message = "Database error when trying to add card!";
      return result;
    }


  },

  /**
   * allows a card to be reported
   * @param {*} cardId ID of the card being reported
   */
  reportThisCard: async(cardId) => {
    let success = false;
    try{
      const stmt = await db.prepare(
        "INSERT INTO reports(card_id, time) VALUES (@id, @time)"
      );
      const result = await stmt.run(
        {
          "@id": cardId,
          "@time": Date.now()
        }
      );
      console.log(result);

      return result;

    } catch (dbError) {
      console.error(dbError);
      return false;
    }
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
      success = await db.run("DELETE FROM cards WHERE id = ?", id);
      console.log(success);
    } catch (dbError) {
      console.error(dbError);
    }
    return success.changes > 0 ? true : false;
  },

  /**
   * attempts to obtain all info from all reports
   * TODO: ensure that this can only be called from admin panel or something
   * @returns 
   */
  getReports: async() => {
    
    try {
      return await db.all("SELECT * FROM reports");
    } catch (dbError){
      console.error(dbError);
      return [];
    }
  
  },

  /**
   * attempts to get IDs of all reports.
   * TODO: ensure that this can only be called from admin panel or something
   * @returns IDs from all reports
   */
  getReportIds: async() => {
    try {
      return await db.all("SELECT id FROM reports");
    } catch (dbError){
      console.error(dbError);
      return [];
    }
  },

  /**
   * attempts to get full details about the given report
   * TODO: ensure that this can only be called from admin panel or something
   * @param {*} reportID ID of the report we want to view
   * @returns full details for the given report
   */
  getReport: async(reportID) => {
    try {
      return await db.all("SELECT * FROM reports WHERE id = ?",reportID);
    } catch (dbError){
      console.error(dbError);
      return [];
    }
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
      success = await db.run("DELETE FROM reports WHERE id = ?", reportId);
      console.log(success);
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
      success = await db.run("DELETE FROM reports WHERE card_id = ?", cardId);
      console.log(success);
    } catch (dbError) {
      console.error(dbError);
      return false;
    }
    return success.changes > 0 ? true : false;
  }


  /*
  // Get the messages in the database
  getMessages: async () => {
    try {
      return await db.all("SELECT * from Messages");
    } catch (dbError) {
      console.error(dbError);
    }
  },

  // Add new message
  addMessage: async message => {
    let success = false;
    try {
      success = await db.run("INSERT INTO Messages (message) VALUES (?)", [
        message
      ]);
    } catch (dbError) {
      console.error(dbError);
    }
    return success.changes > 0 ? true : false;
  },

  // Update message text
  updateMessage: async (id, message) => {
    let success = false;
    try {
      success = await db.run(
        "Update Messages SET message = ? WHERE id = ?",
        message,
        id
      );
    } catch (dbError) {
      console.error(dbError);
    }
    return success.changes > 0 ? true : false;
  },

  // Remove message
  deleteMessage: async id => {
    let success = false;
    try {
      success = await db.run("Delete from Messages WHERE id = ?", id);
    } catch (dbError) {
      console.error(dbError);
    }
    return success.changes > 0 ? true : false;
  }
  */
};
