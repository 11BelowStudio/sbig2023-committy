const {
    fastify
} = require("../server.js");

const ShortURL = require("../utils/ShortURL.js");

module.exports = {
    fastify: fastify,
    ShortURL: ShortURL
};