# ![Committy](./src/public/assets/icons/committy.svg)!

[https://committy.glitch.me](https://committy.glitch.me)

**The collaborative card game that's the sum of everyone's suggestions!**

This is the git repository for *Committy*, a 'game' I made for the
[*So Bad It's Good Jam 2023*](https://itch.io/jam/sbigjam2023).
([link to the jam entry](https://itch.io/jam/sbigjam2023/rate/2204456))

The theme for the jam this year was 'Every Suggestion Combined',
so I opted to go completely sideways and attempted to create something that
would be the sum of the suggestions of the users.

In essence, it's a card game where every single card is a user suggestion,
and the interactions between the cards are also user suggestions (but,
once an interaction has been established, that precedent applies forever).

## Technical stuff

This was my first ever attempt at doing web development involving node.js
(and first attempt at doing anything that involved serverside web
development and databases since the start of my undergrad degree).
So, if you're wondering why this is so scuffed - that's why.

It has a frontend website (allowing cards to be submitted, viewed,
and has a playable MVP implementation of Committy) and a somewhat-complete
(albeit undocumented) REST API for Committy as well.

## How to play Committy

The core gameplay is relatively simple.

1. Player 1 and Player A are dealt a hand of 3 (or more) cards from the deck.
They can see their hand and their opponent's hand.
2. Player 1 and Player A need to pick a card from their hand.
They should pick whatever card they think will be objectively superior to
whatever card their opponent will play.
3. When both players have chosen a card, the game will search the results
database to see if the interaction between those two cards has a known
outcome. If the outcome is known, the player who played the superior card
wins the point.
4. *However*, if the outcome has never happened before, Player 1 and
Player A need to find a third party, and then must argue as to why their
card is objectively superior (with the third party having the final say).
Whoever convinces the third party that their card is superior wins the
point, and this verdict is to be recorded on the database for posterity.

Neither player is explicitly informed about whether or not the relationship
between any cards exists prior to both players playing their card. Why?
Because that would ruin the *fun*.

## Notes about the state of the project

This version of Committy is ultimately a Minimum Viable Product, rather
than the 'full' version I had originally envisioned, due to time
constraints for the game jam, and other IRL circumstances compounding the
time crunch. The game is playable, but it pretty much requires all players
to share the same device (connected to the internet) in order to actually
play the game. As of time of writing, I am unsure if I will be attempting
to continue working on Committy.

The initial plan for Committy was to have online multiplayer games (for 3+
players) with room codes, for ease of use when playing online. Gameplay would work similarly to *Quiplash*, as follows:

* Objectives/scoring
  * The first player to reach *n* points (3 points?) wins
  (earning 1 point for winning a round)
  * Players can **only** see their own score.
  * Only the player currently in **last place** (or, in case of a tie, the
  last-place player who has been in last place the longest) is informed
  that they are currently in last place.
    * **nobody else** is told **anything** about who is in what position.
    * Last place is **only** told that they are in last place (no further
    information is given to them).
    * (this is to prevent diplomatic stalemates)
* Gameplay (each round)
  1. Two players are automatically picked to be Player 1 and Player A
  (henceforth referred to as *active players*).
      * Not the same pairing of players as the previous round (intended to
      allow everyone to have roughly the same number of turns as each 
      other)
      * The remaining player(s) are designated as **The Jury**.
  2. The two *active players* are dealt a hand of 3 (or more) cards from
  the deck.
      * They can see their hand and their opponent's hand.
      * The Jury are unable to see the hands of the *active players*.
  3. The two *active players* must pick a card from their hand that they
  think will be objectively superior to whatever card their opponent will
  play.
      * *nobody* is informed about known interactions between the cards.
      * Players choose their cards simultaneously (like in
      rock-paper-scissors)
  4. The chosen cards are revealed to all players (active players and
  jury). The cards which were not chosen are shuffled into the deck.
  5. The database checks if the outcome between the chosen cards is known.
  If so, the player who played the 'objectively superior' card wins the
  point (and the round ends).
  6. If the outcome is not known, the active players must convince
  the members of The Jury that their card is objectively superior.
      * The Jury will vote on whatever card they think is objectively
      superior, based on the arguments presented by each player.
      * A simple majority (>50%) is sufficient.
      * In case of a tie, the vote of the Jury member in last place
      (relative to everyone else in the Jury) is deemed to be the casting
      vote.
      * This verdict is then stored in the database, and shall be used
      whenever those two cards are put up against each other in *all*
      future rounds in *all* games.
      * The player whose card was deemed objectively superior wins the
      point.
        * If that player now has *n* points, the game ends, and they
        are declared the winner (and all players may see their scores).

## CREDITS

see [credits.md](./credits.md)

---

and now time for the leftover README from the template project that I
pretty much burnt to the ground and rebuilt to produce Committy

## Hello SQLite (blank)

This project includes a [Node.js](https://nodejs.org/en/about/) server script that uses a persistent [SQLite](https://www.sqlite.org) database.

The database stores chat messages, each one with an ID and string of message text. The endpoints allow the client to retrieve, add, update, and delete messages, using an admin key you can set in the `.env`.

_The home route `/` lists the endpoints in the API. With the Glitch editor open showing the preview on the right, click __Change URL__ and add `messages` to the end to see the first `GET` request._

_Last updated: 10 July 2023_

### What's in this project?

← `README.md`: That’s this file, where you can tell people what your cool website does and how you built it.

← `server.js`: The Node.js server defines the endpoints in the site API, processing requests, connecting to the database using the `sqlite.js` script, and sending info back to the client.

← `sqlite.js`: The database script handles setting up and connecting to the SQLite database. The `server.js` API endpoints call the functions in the database script to manage the data.

When the app runs, the scripts build the database:

← `.data/chat.db`: Your database is created and placed in the `.data` folder, a hidden directory whose contents aren’t copied when a project is remixed. You can see the data in the Glitch Log when the scripts first execute.

← `package.json`: The NPM packages for your project's dependencies.

← `.env`: The environment is cleared when you initially remix the project, but you can add and edit.

### Setting up your admin key

The API allows the client to update data if a valid key is provided. This is a simplified example of auth that checks if the submitted key matches the one in the `.env`.

To set your app up to support auth:

* In your `.env` file, find the variable named `ADMIN_KEY` and give it a text string as a value.
* Pass the value with requests in an `admin_key` header.

### Making requests

You can make requests to the API using curl on the command line or from any API client. Grab your API base URL when you remix the project–you can get it by clicking __Show__.

The following outline indicates requirements for each endpoint:

* `GET /messages`
* `POST /message` 🔒
  * Include a request __Body__ with a property named `message`
* `PUT /message` 🔒
  * Include a request __Body__ with properties `id` and `message`
* `DELETE /message` 🔒
  * Include a query parameter named `id`

🔒 For endpoints requiring auth:
* Include your admin key value from the `.env` in a request header named `admin_key`.

![Glitch](https://cdn.glitch.com/a9975ea6-8949-4bab-addb-8a95021dc2da%2FLogo_Color.svg?v=1602781328576)

### You built this with Glitch!

[Glitch](https://glitch.com) is a friendly community where millions of people come together to build web apps and websites.

- Need more help? [Check out our Help Center](https://help.glitch.com/) for answers to any common questions.
- Ready to make it official? [Become a paid Glitch member](https://glitch.com/pricing) to boost your app with private sharing, more storage and memory, domains and more.
