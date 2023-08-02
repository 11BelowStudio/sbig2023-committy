/*
 * ShortURL (https://github.com/delight-im/ShortURL)
 * Copyright (c) delight.im (https://www.delight.im/)
 * Licensed under the MIT License (https://opensource.org/licenses/MIT)
 */

/**
 * _ShortURL: Bijective conversion between natural numbers (IDs) and short strings
 *
 * _ShortURL.encode() takes an ID and turns it into a short string
 * _ShortURL.decode() takes a short string and turns it into an ID
 *
 * Features:
 * + large alphabet (51 chars) and thus very short resulting strings
 * + proof against offensive words (removed 'a', 'e', 'i', 'o' and 'u')
 * + unambiguous (removed 'I', 'l', '1', 'O' and '0')
 *
 * Example output:
 * 123456789 <=> pgK8p
 */
var _ShortURL = new function() {

	var _alphabet = '23456789bcdfghjkmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ-_',
		_base = _alphabet.length;

	this.encode = function(num) {
		var str = '';
		while (num > 0) {
			str = _alphabet.charAt(num % _base) + str;
			num = Math.floor(num / _base);
		}
		return str;
	};

	this.decode = function(str) {
		var num = 0;
		for (var i = 0; i < str.length; i++) {
			num = num * _base + _alphabet.indexOf(str.charAt(i));
		}
		return num;
	};

};


const ShortURL = new function() {

	const _alphabet = [
        "Tiny",
        "Open",
        "World",
        "Jazz",
        "Dino",
        "Haunted",
        "Toothbrush",
        "Translation",
        "Jank",
        "Pizza",
        "Underground",
        "Tax",
        "Evade",
        "Kevin",
        "Speed",
        "Banned",
        "Comic",
        "Large",
        "Spoon",
        "Excessive",
        "Pacifist",
        "Simulate",
        "Every",
        "Suggest",
        "Monkey",
        "Keyboard",
        "Kick",
        "Baby",
        "Explosive",
        "Butter",
        "Quantum",
        "Quack",
        "Osha",
        "Violate",
        "Votebot",
        "Deep",
        "Lore",
        "Fantasy",
        "But",
        "Why",
        "Nice",
        "Canon",
        "Game",
        "Poor",
        "Sale",
        "Depths",
        "Growth",
        "Cat",
        "Industrial",
        "Rotate",
        "Furry",
        "Tumblr",
        "Blood",
        "Fish",
        "Business",
        "Stick",
        "Bees",
        "Many",
        "Obsession",
        "Uncomfy",
        "Killing",
        "Revenge",
        "Joke",
        "Happen",
        "Eyebrow",
        "Raise",
        "Patent",
        "Boomer",
        "Plaid",
        "Fool",
        "Nothing",
        "Gravity",
        "Ludonarrative",
        "Dissonance",
        "Sunk",
        "Fallacy",
        "Fishing",
        "Wacky",
        "Graphics",
        "Bit",
        "Flamingo",
        "Wave",
        "Even",
        "Odd",
        "Submarine",
        "Bot",
        "Banana",
        "Box",
        "Book",
        "Bounce",
        "Blurple",
        "Live",
        "Vend",
        "Prove",
        "Multiple",
        "Savage",
        "All",
        "Go",
        "Backwards",
        "Moist",
        "Epoch",
        "Turtle",
        "Power",
        "Plan",
        "Progress",
        "Censor",
        "Certified",
        "Luton",
        "Inject",
        "Clown",
        "Whatever",
        "Crash",
        "Stain",
        "Ballpit",
        "Dashcon",
        "Bone",
        "App",
        "Teeth",
        "Linus",
        "Tech",
        "Future",
        "Sportsball",
        "Mix",
        "Napalm",
        "Lie",
        "Laugh",
        "Bad",
        "Guy",
        "Amogus",
        "Out",
        "Wage",
        "Procrastinate",
        "Diet",
        "Supplement",
        "Snail",
        "Tea",
        "Vicar",
        "Rock",
        "Instance",
        "Trade",
        "Shoot",
        "Messenger",
        "Tweet",
        "Argue",
        "So",
        "Brave",
        "Upron",
        "Moon",
        "Jetpack",
        "Prank",
        "Gacha",
        "Saint",
        "David",
        "Tennant",
        "Giant",
        "Flying",
        "Sheep",
        "About",
        "Time",
        "Taxman",
        "Cometh",
        "Sisyphus",
        "Change",
        "Artificial",
        "Stupid",
        "Least",
        "Worst",
        "Choice",
        "Barrel",
        "Attract",
        "Insect",
        "Disco",
        "Inferno",
        "Conduct",
        "Ritual",
        "Destruct",
        "Derby",
        "Already",
        "Been",
        "Here",
        "Number",
        "Deja",
        "Vu",
        "Chaos",
        "Lawn",
        "Mow",
        "Stole",
        "G",
        "Require",
        "Finance",
        "Letter",
        "Animate",
        "Texture",
        "Endless",
        "Overpressure",
        "Wall",
        "Exist",
        "Shame",
        "Product",
        "Placement",
        "Jackson",
        "Muntjac",
        "Nicolas",
        "Cage",
        "Observe",
        "Otter",
        "No",
        "Phase",
        "Those",
        "Plumb",
        "Lead",
        "Contaminate",
        "Chonk",
        "Sue",
        "Spinach",
        "Too",
        "Misuse",
        "Mirror",
        "Overthrow",
        "School",
        "Board",
        "Nixon",
        "Object",
        "Funf",
        "Minuten",
        "Toilet",
        "Unicorn",
        "Just",
        "Minute",
        "Moment",
        "Dollar",
        "Grimace",
        "Shake",
        "Danger",
        "Alone",
        "Kafka",
        "Futile",
        "Washed",
        "Up"
    ],
		_base = _alphabet.length;
    const _separator = "-";

	this.encode = function(num) {

        for(let extra = 0; extra < 2; extra++){

            let sum = num
            let arr = []
            let reducer = (a,b) => parseInt(a) + parseInt(b)

            while (sum > 9) {
                arr = sum.toString().split("")
                sum = arr.reduce(reducer)
            }

            num = (num * 10) + sum;
        }

        var result = [];
        while (num > 0){
            result.unshift(
                _alphabet[num % _base]
            );
            
            
            num = Math.floor(num / _base);
            
        }
        
        let outRes = result.join(_separator);
        
		return outRes;
	};

	this.decode = function(str) {
		var num = 0;

        const decList = str.split(_separator);
		for (var i = 0; i < decList.length; i++) {

            const thisMult = _alphabet.findIndex(
                item => decList[i].toLowerCase() === item.toLowerCase()
                
            );

            if (thisMult == -1){
                num = NaN;
                throw `invalid input - ${decList[i]} is not present in encoder list!`;
            }
            
			num = num * _base + thisMult;
            
		}

        var numRoots = num % 100;

        var numRaw = (num - numRoots)/100;

		return numRaw;
	};

}();


export{
    ShortURL
}