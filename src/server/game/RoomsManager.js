const {
    fastify
} = require("../server.js");

const ShortURL = require("../utils/ShortURL.js");

class RoomsManager{

    static #isInternalConstructing = false;

    
    static #_instance = null;
    
    /**
     * obtains the RoomsManager.
     * @returns {RoomsManager} the RoomsManager instance
     */
    static Instance(){
        if (RoomsManager.#_instance == null){
            RoomsManager.#isInternalConstructing = true;
            RoomsManager.#_instance = new RoomsManager();
        }
        return RoomsManager.#_instance;
    }

    constructor(){
        if (!RoomsManager.#isInternalConstructing){
            throw TypeError("RoomsManager constructor is not allowed to be called! Use RoomsManager.Instance() instead.");
        }
        RoomsManager.#isInternalConstructing = false;

        this.roomsMap = new Map();

        // TODO
    }
    
    
}


module.exports = {
    RoomsManager: RoomsManager
};