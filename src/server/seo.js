const index_seo = {
    glitch_help_instructions: "For a custom domain, change the 'url' parameter from 'glitch-default' to your domain _without_ a traling slash, like 'https://www.example.com'",
    title: "Committy",
    description: "The collaborative card game that you may or may not regret unwillingly contributing to",
    url: "https://committy.glitch.me",
    image: "https://cdn.glitch.global/4b696f81-b7e8-4183-8f3c-c687afece712/committy_logo.png?v=1692028542027",
    db: "SQLite"
}


function view_card_seo(id){
    

    if (id === undefined || id.toString().trim() === "" || id.toString().trim() === "random"){
        return {
            title: "Committy - View a random card!",
            description: "Ever wanted to see a random card from Committy? Well, now's your chance!",
            url: "https://committy.glitch.me/view_card",
            image: "https://cdn.glitch.global/4b696f81-b7e8-4183-8f3c-c687afece712/committy_logo.png?v=1692028542027"
        }
    }
    return {
        title: `Committy - Viewing card #${id}`,
        description: "I wonder what this card is!",
        url: `https://committy.glitch.me/view_card/${id}`,
        image: "https://cdn.glitch.global/4b696f81-b7e8-4183-8f3c-c687afece712/committy_logo.png?v=1692028542027"
    }
}


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
        url: `https://committy.glitch.me/game/${hand_size}/${seed}`,
        image: "https://cdn.glitch.global/4b696f81-b7e8-4183-8f3c-c687afece712/committy_logo.png?v=1692028542027"
    }
}

function mvp_judgement_seo(c1, c2) {
    return {
        title: "Committy - Judgement time!",
        description: "Which of these two cards is objectively superior?",
        url: `https://committy.glitch.me/game/chosen/${c1}/${c2}`,
        image: "https://cdn.glitch.global/4b696f81-b7e8-4183-8f3c-c687afece712/committy_logo.png?v=1692028542027"
    }
}

const submit_card_seo = {
    title: "Committy - Card Creator",
    description: "Do you think all of the existing cards in Committy are bad? Yes? Well, here's your chance to add something better",
    url: "https://committy.glitch.me",
    image: "https://cdn.glitch.global/4b696f81-b7e8-4183-8f3c-c687afece712/committy_logo.png?v=1692028542027"
}

const mvp_verdict_seo = {
    title: "Committy - Judgement time!",
    description: "Let's see which card is the best card!",
    url: `https://committy.glitch.me/game/verdict`,
    image: "https://cdn.glitch.global/4b696f81-b7e8-4183-8f3c-c687afece712/committy_logo.png?v=1692028542027"
}

export{
    index_seo,
    view_card_seo,
    mvp_game_seo,
    mvp_judgement_seo,
    mvp_verdict_seo,
    submit_card_seo
};