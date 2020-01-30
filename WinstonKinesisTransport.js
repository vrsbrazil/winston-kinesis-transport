const { Transport } = require('winston')
const { putRecord } = require('./AWS/KinesisClient')
const { log } = require('winston/lib/winston/common')

const dependencies = {
  log,
  random: Math.random,
  putRecord
}

const LOGGED = 'logged'

class WinstonKinesisTransport extends Transport {
  constructor (options) {
    super(options)
    const { log, random, putRecord } = Object.assign({}, dependencies)
    this.injection = { random, putRecord }
    this.options = options
  }

  onSuccess (data, callback) {
    this.emit(LOGGED)
    callback(null, data)
  }

  async log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const options = Object.assign({
      showLevel: true,
      timestamp: true,
      level: info.level,
      message: info.message
    }, this.options)

    const kinesisObject = {
      data: JSON.stringify(info),
      partitionKey: `${this.injection.random()}`,
      streamName: this.options.streamName,
      configuration: this.options.configuration
    }

    try {
      const data = await this.injection.putRecord(kinesisObject)
      this.onSuccess(data, callback)
    } catch (error) {
      callback(error)
    }

    // Perform the writing to the remote service
    callback();
  }
}

WinstonKinesisTransport.prototype.name = 'Kinesis'

module.exports = WinstonKinesisTransport