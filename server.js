const PosTagger = require('wink-pos-tagger')
const https = require('http')
const got = require('got')
const fs = require('fs')
const html = fs
  .readFileSync(`${__dirname}/index.html`, 'utf8');

const tagger = PosTagger()

/** @type{string[]} */
const nouns = require('./nouns')

const quoteApiUrl ='http://quote.machinu.net/api'
const port = process.env.PORT || 3000

/**
 * @typedef QuoteResponse
 * @type {object}
 * @property {string} text - The quote
 * @property {string} name - The person saying the quote
 * @property {string} movie - Which movie the quote is from from
 * @property {number} year - Which year the movie was released
 * @property {string} imdbID - ID to movie at IMDB
 */

 /**
 * @typedef TaggedSentence
 * @type {object}
 * @property {string} value - actual word
 * @property {string} tag
 * @property {string} normal
 * @property {string} pos - Type of word
 */

/**
 * Fetches a quote from MetaProphet Quote API
 * @returns {QuoteResponse} A quote with metadata
 */
const getQuote = async () => {
    const { body } = await got(quoteApiUrl)
    return JSON.parse(body)
}

/**
 * Turns a string into a tagged pos tagged scentence
 * @param {string} quote 
 * @returns {TaggedSentence}
 */
const tagQuote = (quote) => {
  return tagger.tagSentence(quote)
}

/**
 * Checks if the quote contains a noun
 * @param {TaggedSentence} taggedQuote 
 * @returns {boolean}
 */
const getNoun = (taggedQuote) => {
  return taggedQuote
    .filter(tag => tag.pos === 'NNP')[0]
}

/**
 * Gets a random number of an arrays length
 * @param {[]} array 
 * @returns {number}
 */
const random = (array) =>
  Math.floor(Math.random() * array.length)

/**
 * @returns {Promise<QuoteResponse>}
 */
const getAndFormatQuote = async () => {
  const maxNumberOfTries = 3;
  let foundNoun = false;
  let tries = 0;
  let quote = '';
  let found;
  let tagged;
  do {
    quote = await getQuote();
    tagged = tagQuote(quote.text);
    found = getNoun(tagged);
    if(found) {
      foundNoun = true;
    } else {
      tries++;
    }
  } while(!foundNoun && tries < maxNumberOfTries)
  const randomBeerNoun = nouns[random(nouns)];
  return {
    ...quote,
    text: found
      ? quote.text.replace(found.value, randomBeerNoun)
      : quote.text
  }
}

https.createServer(async (_, res) => {
    const quote = await getAndFormatQuote();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html
      .replace('{%quote%}', quote.text)
      .replace('{%person%}', quote.name)
      .replace('{%year%}', quote.year)
      .replace('{%movie%}', quote.movie)   
      .replace('{%id%}', quote.imdbID)
    )
}).listen(port); 
