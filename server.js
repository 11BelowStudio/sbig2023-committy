/**
 * This is the main server script that provides the API endpoints
 *
 * Uses sqlite.js to connect to db
 */



const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: true
});

fastify.register(require("@fastify/formbody"));

const db = require("./sqlite.js");
const errorMessage =
  "Whoops! Error connecting to the database–please try again!";

// OnRoute hook to list endpoints
const routes = { endpoints: [] };
fastify.addHook("onRoute", routeOptions => {
  routes.endpoints.push(routeOptions.method + " " + routeOptions.path);
});

// Just send some info at the home route
fastify.get("/", (request, reply) => {
  const data = {
    title: "Hello SQLite (blank)",
    intro: "This is a database-backed API with the following endpoints",
    routes: routes.endpoints
  };
  reply.status(200).send(data);
});


/*
// Return the chat messages from the database helper script - no auth
fastify.get("/messages", async (request, reply) => {
  let data = {};
  data.chat = await db.getMessages();
  console.log(data.chat);
  if(!data.chat) data.error = errorMessage;
  const status = data.error ? 400 : 200;
  reply.status(status).send(data);
});

// Add new message (auth)
fastify.post("/message", async (request, reply) => {
  let data = {};
  const auth = authorized(request.headers.admin_key);
  if(!auth || !request.body || !request.body.message) data.success = false;
  else if(auth) data.success = await db.addMessage(request.body.message);
  const status = data.success ? 201 : auth ? 400 : 401;
  reply.status(status).send(data);
});

// Update text for an message (auth)
fastify.put("/message", async (request, reply) => { 
  let data = {};
  const auth = authorized(request.headers.admin_key);
  if(!auth || !request.body || !request.body.id || !request.body.message) data.success = false;
  else data.success = await db.updateMessage(request.body.id, request.body.message); 
  const status = data.success ? 201 : auth ? 400 : 401;
  reply.status(status).send(data);
});

// Delete a message (auth)
fastify.delete("/message", async (request, reply) => {
  let data = {};
  const auth = authorized(request.headers.admin_key);
  if(!auth || !request.query || !request.query.id) data.success = false;
  else data.success = await db.deleteMessage(request.query.id);
  const status = data.success ? 201 : auth ? 400 : 401;
  reply.status(status).send(data);
});
*/

fastify.get("/cards", async(request, reply) => {
  
  let data = {};
  data.cards = await db.getCards();
  console.log(data.cards);
  if (!data.cards) data.error = errorMessage;
  const status = data.error ? 400 : 200;
  reply.status(status).send(data);
  
});

fastify.get("/card/:id", async(request, reply) => {
  let data = {};
  console.log(request.params);
  data.card = await db.getCard(request.params.id);
  console.log(data.card);
  if (!data.card) data.error = errorMessage;
  const status = data.error ? 400 : 200;
  reply.status(status).send(data);

});

fastify.get("/card_ids", async(request, reply) => {
  let data = {};
  data.cardIDs = await db.getCardIDs();
  console.log(data.cardIDs);
  if (!data.cardIDs) data.error = errorMessage;
  const status = data.error ? 400 : 200;
  reply.status(status).send(data);
});

/**
 * obtains the cards via HATEOAS (Hypermedia As The Engine of Application State)
 */
fastify.get("/card_links", async(request, reply) => {
  let data = {};
  let allIDs = await db.getCardIDs();
  if (!allIDs){
    data.error = errorMessage;
  } else {
    for(const itm of allIDs){
      itm["url"] = `https://${request.hostname}/card/${itm["id"]}`;
    }
    data.cardIDs = allIDs;
  }
  const status = data.error ? 400 : 200;
  reply.status(status).send(data);
  
});

fastify.post("/report", async (request, reply) => {
  let data = {};

  if(!request.body || !request.body.id){
    data.success = false;
  }
  else {
    data.success = await db.reportThisCard(request.body.id);
  }
  const status = data.success ? 201 : 400;
  reply.status(status).send(data);
});

// Helper function to authenticate the user key
const authorized = key => {
  if (
    !key ||
    key < 1 ||
    !process.env.ADMIN_KEY ||
    key !== process.env.ADMIN_KEY
  )
    return false;
  else return true;
};

// Run the server and report out to the logs
fastify.listen({port:process.env.PORT, host:'0.0.0.0'}, function(err, address) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
});
