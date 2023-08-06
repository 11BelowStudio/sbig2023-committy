
/**
 * Constants for cards to adhere to basically
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
     * @param {*} id_number 
     * @returns 
     */
    card_id_to_css_class: function(id_number){
        if (id_number == null || id_number === ""){
            return "";
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
        };
    }
}
