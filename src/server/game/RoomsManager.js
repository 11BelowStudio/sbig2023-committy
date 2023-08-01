const { error } = require("jquery");
const {
    fastify,
    ShortURL
} = require("./imports");
const { response, request } = require("express");


class RoomsManager{

    static #isInternalConstructing = false;

    
    static #_instance = null;

    /**
     * there's a method in this madness, trust me.
     */
    static #_id_offset = 42662800000;
    
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


    newRoom(){

        const id_base = Math.floor(Date.now() - RoomsManager.#_id_offset);

        const encoded_id = ShortURL.encode(id_base);

        if (id_base != ShortURL.decode(encoded_id)){
            const message =`MASSIVE ENCODE/DECODE WHOOPSIE - input ${id_base} lead to output ${ShortURL.decode(encoded_id)} instead`;
            console.error(message);
            throw message;
        }
    }
    

    roomExists(roomString){

        try{
            const decode = ShortURL.decode(roomString);
            return this.roomsMap.has(decode);
        } catch(error){
            return false;
        }
    }
    
}


fastify.get("/create", function(request, response) {





});


fastify.get("/play/:roomID", function(request, response){


});

module.exports = {
    RoomsManager: RoomsManager
};