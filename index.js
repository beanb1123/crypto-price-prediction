require('dotenv').config();
const tf = require('@tensorflow/tfjs-node');
const Binance = require('node-binance-api');

const fetch = require('node-fetch2');

let s_time = Date.now();

async function main() {

const binance = new Binance().options({
            useServerTime: false,
            family: 4,
                urls: {
                base: "https://api.binance.us/api/",
                stream: "wss://ws-api.binance.us/ws-api/v3/"
            },
        });

const [,,pair, intvl] = process.argv;
const sequenceLength = 5;
const batchSize = 32;
const epochs = 100;
const coinPair = typeof pair !== 'undefined' ? pair.toString().toUpperCase() : 'BNBUSDT';
const interval = typeof intvl !== 'undefined' ? intvl.toString() : '1m';
const learningRate = '0.01';


//let s_time = Date.now(); Get price data for a cryptocurrency
binance.candlesticks(coinPair, interval, (error, ticks) => {
  if (error) {
    console.log(`Error: ${error}`);
  } else {
    // Prepare data for training

    const data = ticks.slice(-sequenceLength - batchSize).map(tick => parseFloat(tick[4]));
    const xs = [];
    const ys = [];
    for (let i = 0; i < data.length - sequenceLength; i++) {
      const x = data.slice(i, i + sequenceLength);
      const y = data[i + sequenceLength];
      xs.push(x);
      ys.push(y);
    }
    // Reshape data for LSTM 
    const input = tf.tensor3d([xs], undefined, 'float32');
    const output = tf.tensor1d(ys);

    // Define and train model
    // LSTM Model 
  const model = tf.sequential();
  model.add(tf.layers.lstm({
   units: sequenceLength, // Adjust units as needed
   inputShape: [sequenceLength, 1], 
   returnSequences: false // Return single output for prediction
  }));
  model.add(tf.layers.dense({ units: 1 })); 

  model.compile({ 
    optimizer: tf.train.adam(learningRate), 
    loss: 'meanAbsoluteError', // Suitable for price data
    metrics: ['mae'] // Track mean absolute error
  });

  model.fit(input, output, { batchSize, epochs }).then(() => {
      // Make a price prediction
      const latestData = data.slice(-sequenceLength);
      const input = tf.tensor3d([latestData], undefined, 'float32');
      const prediction = model.predict(input).dataSync()[0];
      const latestPrice = parseFloat(ticks[ticks.length - 1][4]);
      const nextPrice = latestPrice + prediction;
      const formattedPrice = nextPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

      console.log(`\n====================\n`);
      console.log(`${coinPair} price prediction: ${formattedPrice}`);
      console.log(`\n====================\n`);

    });                  
  }
});
}

  async function final() {  

    let e_time = Date.now();

    let minus_time = e_time - s_time;

    let wait_time = 300000 - minus_time;

    await new Promise(resolve => setTimeout(resolve, wait_time));
      
    let real_price = await (await fetch('https://www.binance.us/api/v3/ticker/price?symbol=BNBUSDT')).json();
    console.log(real_price);

  }

async function all() {
await main();
await final();
}
all();
