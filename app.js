var { PrivateKey, Client, DatabaseAPI } = require('dsteem');
var mongoose = require('mongoose');
var { CronJob } = require('cron');

var Schema = mongoose.Schema;

var dsteemClient = new Client('https://api.steemit.com');

var dsteemKey = PrivateKey.fromString('5JrvPrQeBBvCRdjv29iDvkwn3EQYZ9jqfAHzrCyUvfbEbRkrYFC');

var CurrensyPairModel = new Schema({
    base: Number,
    quote: Number,
},{ timestamps: true });


var broadcastData = async (data) => {
    await dsteemClient.broadcast.json({
        id: Date.now().toString(),//created id for dataNow
        required_auths: [],
        required_posting_auths: ['social'],
        json: JSON.stringify(data)
    }, dsteemKey);
    // end prog
    console.log('successfull end');
}

var getData = async () => {
    var db = await mongoose.connect('mongodb://localhost/testdb', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });//connect for bd
    
    var CurrensyPair = mongoose.model('currensyPair', CurrensyPairModel);//cteated collection currensyPair
    
    var data = await new DatabaseAPI(dsteemClient).getCurrentMedianHistoryPrice();//take data
    
    
    await CurrensyPair.create({
        base: data.base.amount,
        quote: data.quote.amount,
    });

    var [avarageData] = await CurrensyPair.aggregate([
        { "$match": { "createdAt": { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
        {
            $group: {
                _id: null,
                avrBase: { $avg: "$base" },
                avrQuote: { $avg: "$quote" },
            }
        }
    ]);//take result for 24 hours
    
    await db.disconnect();
    
    await broadcastData({
        avrBase: avarageData.avrBase,
        avrQuote: avarageData.avrQuote,
    });
    
}

var job = new CronJob('* * * * *', () => {
    console.log('CronJob do');
    getData();
});


job.start();