const RECORD_TYPE = 20;

var fs = require('fs'),
    log = console.log,
    defaultTime = new Date(1989, 12, 31, 0, 0, 0),
    FitState = function(file, errors) {
      this.file = file;
      this.errors = errors || { errors: [] };
      this.rideFile;
      this.startTime = 0;
      this.lastTime = 0;
      this.lastDistance = 0;
      this.localMsgTypes = {};
      this.unknownRecordFields = [];
      this.unknownGlobalMsgNums = [];
      this.unknownBaseType = [];
      this.interval = 0;
      this.calibration = 0;
      this.devices = 0;
      this.stopped = true;
      this.lastEventType = -1;
      this.lastEvent = -1;
      this.lastMsgType = -1;
      this.fd = fs.openSync(this.file, 'r');
    },
    proto = FitState.prototype,
    readFromFile = function(size, count) {
      var buf = new Buffer(size);
      if ( fs.readSync(this.fd, buf, 0, size) !== size ) {
        throw new Error();
      }
      if ( count ) {
        count.count += size;
      }
      return buf;
    },
    RideFile = function() {
      if ( ! ( this instanceof RideFile ) ) {
        return new RideFile();
      }
      this.dataPoints = [];
      this._intervals = [];
      this._calibrations = [];
    },
    FitField = function() {
      this.num;
      this.type;
      this.size;
    },
    FitDefinition = function() {
      this.globalMsgNum;
      this.isBigEndian;
      this.fields = [];
    };

{
  RideFile.prototype.deviceType = function(deviceType) {
    if ( deviceType === void 0 ) {
      return this._deviceType;
    }
    this._deviceType = deviceType;
    return this;
  };
  RideFile.prototype.recIntSecs = function(recIntSecs) {
    if ( recIntSecs === void 0 ) {
      return this._recIntSecs;
    }
    this._recIntSecs = recIntSecs;
    return this;
  };
  RideFile.prototype.fileFormat = function(fileFormat) {
    if ( fileFormat === void 0 ) {
      return this._fileFormat;
    }
    this._fileFormat = fileFormat;
    return this;
  };
  RideFile.prototype.addInterval = function(start, stop, name) {
    this.intervals.push({ start: start, stop: stop, name: name });
  };
  RideFile.prototype.startTime = function(startTime) {
    if ( startTime === void 0 ) {
      return this._startTime;
    }
    this._startTime = startTime;
    return this;
  };
  RideFile.prototype.appendPoint = function(secs, cad, hr, km, kph, nm, watts, alt, lng, lat, headwind, slope, temperature, lrbalance, leftTorqueEff, rightTorqueEff, leftPedalSmooth, rightPedalSmooth, smO2, tHb, interval) {
    var fix = function(val) {
      return !isFinite(val) || val < 0 ? 0 : val;
    };
    this.dataPoints.push({
      secs: fix(secs),
      cad: fix(cad),
      hr: fix(hr),
      km: fix(km),
      kph: fix(kph),
      nm: fix(nm),
      watts: fix(watts),
      alt: fix(alt),
      lng: fix(lng),
      lat: fix(lat),
      headwind: headwind,
      slope: slope,
      temp: temperature,
      lrbalance: lrbalance,
      lte: fix(leftTorqueEff),
      rte: fix(rightTorqueEff),
      lps: fix(leftPedalSmooth),
      rps: fix(rightPedalSmooth),
      smo2: fix(smO2),
      thb: fix(tHb),
      interval: interval
    });
  }
  RideFile.prototype.addCalibration = function(start, value, name) {
    this._calibrations.push({
      start: start,
      value: value,
      name: name
    });
  };
}
proto.readUnknown = function(size, count) {
  readFromFile.call(this, size, count);
};

proto.readInt8 = function(count) {
  var buf = readFromFile.call(this, 1, count).readInt8(0);
  return buf === 0x7f ? void 0 : buf;
};

proto.readUInt8 = function(count) {
  var buf = readFromFile.call(this, 1, count).readUInt8(0);
  return buf === 0xff ? void 0 : buf;
};

proto.readUInt8z = function(count) {
  var buf = readFromFile.call(this, 1, count).readUInt8(0);
  return buf === 0x00 ? void 0 : buf;
};

proto.readInt16 = function(isBigEndian, count) {
  var buf = readFromFile.call(this, 2, count)['readInt16' + ( isBigEndian ? 'BE' : 'LE' )](0);
  return buf === 0x7fff ? void 0 : buf;
};

proto.readUInt16 = function(isBigEndian, count) {
  var buf = readFromFile.call(this, 2, count)['readUInt16' + ( isBigEndian ? 'BE' : 'LE' )](0);
  return buf === 0xffff ? void 0 : buf;
};

proto.readUInt16z = function(isBigEndian, count) {
  var buf = readFromFile.call(this, 2, count)['readUInt16' + ( isBigEndian ? 'BE' : 'LE' )](0);
  return buf === 0x0000 ? void 0 : buf;
};

proto.readInt32 = function(isBigEndian, count) {
  var buf = readFromFile.call(this, 4, count)['readInt32' + ( isBigEndian ? 'BE' : 'LE' )](0);
  return buf === 0x7fffffff ? void 0 : buf;
};

proto.readUInt32 = function(isBigEndian, count) {
  var buf = readFromFile.call(this, 4, count)['readUInt32' + ( isBigEndian ? 'BE' : 'LE' )](0);
  return buf === 0xffffffff ? void 0 : buf;
};

proto.readUInt32z = function(isBigEndian, count) {
  var buf = readFromFile.call(this, 4, count)['readUInt32' + ( isBigEndian ? 'BE' : 'LE' )](0);
  return buf === 0x00000000 ? void 0 : buf;
};

proto.decodeFileId = function(def, timeOffset, values) {
  var i = 0,
      manu = -1,
      prod = -1;
  def.fields.forEach(function(field) {
    var value = values[i++];
    if ( value === void 0 ) return;
    if ( field.num === 1 ) {
      manu = value;
    } else if ( field.num === 2 ) {
      prod = value;
    }
    if ( manu === 1 ) {
      if ( prod === 717 ) { this.rideFile.deviceType("Garmin FR405"); }
      else if ( prod === 782 ) { this.rideFile.deviceType("Garmin FR50"); }
      else if ( prod === 988 ) { this.rideFile.deviceType("Garmin FR60"); }
      else if ( prod === 1018 ) { this.rideFile.deviceType("Garmin FR310XT"); }
      else if ( prod === 1036 ) { this.rideFile.deviceType("Garmin Edge 500"); }
      else if ( prod === 1124 ) { this.rideFile.deviceType("Garmin FR110"); }
      else if ( prod === 1169 ) { this.rideFile.deviceType("Garmin Edge 800"); }
      else if ( prod === 1325 ) { this.rideFile.deviceType("Garmin Edge 200"); }
      else if ( prod === 1328 ) { this.rideFile.deviceType("Garmin FR910XT"); }
      else if ( prod === 1561 ) { this.rideFile.deviceType("Garmin Edge 510"); }
      else if ( prod === 1567 ) { this.rideFile.deviceType("Garmin Edge 810"); }
      else if ( prod === 20119 ) { this.rideFile.deviceType("Garmin Training Center"); }
      else if ( prod === 65534 ) { this.rideFile.deviceType("Garmin Connect Website"); }
      else { this.rideFile.deviceType("Garmin " + prod); }
    } else if ( manu === 38 ) {
      if ( prod === 1 ) { this.rideFile.deviceType("o_synce navi2coach"); }
      else { this.rideFile.deviceType("o_synce " + prod); }
    } else {
      this.rideFile.deviceType("Unknown FIT Device " + manu + ":" + prod);
    }
    this.rideFile.fileFormat("FIT (*.fit)");
  }, this);
};

proto.decodeLap = function(def, timeOffset, values) {
  var time = this.lastTime,
      i = 0,
      thisStartTime = 0;
  if ( timeOffset > 0 ) {
    time = this.lastTime + timeOffset;
  }
  ++this.interval;
  def.fields.forEach(function(field) {
    var value = values[i++];

    if ( value === void 0 ) return;
    if ( field.num === 253 ) { time = value + defaultTime.valueOf(); }
    else if ( field.num === 2 ) { thisStartTime = value + defaultTime.valueOf(); }

    if ( thisStartTime === 0 || thisStartTime - this.startTime < 0 ) {
      thisStartTime = this.startTime;
      if ( time === 0 || time - this.startTime < 0 ) {
        this.errors.errors.push('lap ' + this.interval + ' is ignored (invalid end time)');
        return;
      }
    }
    if ( this.rideFile.dataPoints.length ) {
      this.rideFile.addInterval(thisStartTime - this.startTime, time - this.startTime, this.interval);
    }
  }, this);
};

proto.decodeRecord = function(def, timeOffset, values) {
  var time = timeOffset > 0 ? this.lastTime + timeOffset : 0,
      alt = 0,
      cad = 0,
      km = 0,
      hr = 0,
      lat = 0,
      lng = 0,
      badgps = 0,
      lrbalance = 0,
      kph = 0,
      temperature = 0,
      watts = 0,
      slope = 0,
      leftTorqueEff = 0,
      rightTorqueEff = 0,
      leftPedalSmooth = 0,
      rightPedalSmooth = 0,
      smO2 = 0,
      tHb = 0,
      i = 0,
      lati,
      lngi,
      secs,
      nm,
      headwind,
      interval,
      prevPoint,
      deltaSecs;

  def.fields.forEach(function(field) {
    var value = values[i++];
    if ( value === void 0 ) return;

    if ( field.num === 253 ) {
      time = value + defaultTime.valueOf();
      if ( time < this.lastTime ) {
        time = this.lastTime;
      }
    }
    else if ( field.num === 0 ) { lati = value; }
    else if ( field.num === 1 ) { lngi = value; }
    else if ( field.num === 2 ) { alt = value / 5 - 500; }
    else if ( field.num === 3 ) { hr = value; }
    else if ( field.num === 4 ) { cad = value; }
    else if ( field.num === 5 ) { km = value / 100000; }
    else if ( field.num === 6 ) { kph = value * 3.6 / 1000; }
    else if ( field.num === 7 ) { watts = value; }
    else if ( field.num === 8 ) { /* packed speed/dist */ }
    else if ( field.num === 9 ) { slope = value / 100; }
    else if ( field.num === 10 ) { /* resistance */ }
    else if ( field.num === 11 ) { /* time from course */ }
    else if ( field.num === 12 ) { /* cycle length */ }
    else if ( field.num === 13 ) { temperature = value; }
    else if ( field.num === 29 ) { /* accumulated power */ }
    else if ( field.num === 30 ) { lrbalance = ( value & 0x80 ? 100 - ( value & 0x7f ) : value * 0x7f ); }
    else if ( field.num === 31 ) { /* gps accuracy */ }
    else if ( field.num === 43 ) { leftTorqueEff = value / 2; }
    else if ( field.num === 44 ) { rightTorqueEff = value / 2 }
    else if ( field.num === 45 ) { leftPedalSmooth = value / 2 }
    else if ( field.num === 46 ) { rightPedalSmooth = value / 2 }
    else if ( field.num === 47 ) { /* combined pedal smoothness */ }
    else { this.unknownRecordFields.push(field.num) }
  }, this);

  if ( time === this.lastTime ) return;
  if ( this.stopped ) {
    // don't do anything right now
  }
  if ( lati !== void 0 && lngi !== void 0 ) {
    lat = lati * 180 / 0x7fffffff;
    lng = lngi * 180 / 0x7fffffff;
  } else {
    lat = 0;
    lng = 0;
    badgps = 1;
  }
  if ( this.startTime === 0 ) {
    this.startTime = time - 1;
    this.rideFile.startTime(new Date(this.startTime));
  }

  secs = time - this.startTime;
  nm = 0;
  headwind = 0;
  interval = 0;
  if ( this.lastMsgType === RECORD_TYPE && this.lastTime !== 0 && time > this.lastTime + 1 ) {
    prevPoint = this.rideFile.dataPoints[this.rideFile.dataPoints.length - 1];
    deltaSecs = parseInt(secs - prevPoint.secs, 10);
    if ( prevPoint.lat === 0 && prevPoint.lng === 0 ) {
      badgps = 1;
    }
    // Interpolating for missing points
  }
  if ( km < 0.00001 ) km = this.lastDistance;
  this.rideFile.appendPoint(secs, cad, hr, km, kph, nm, watts, alt, lng, lat, headwind, slope, temperature, lrbalance, leftTorqueEff, rightTorqueEff, leftPedalSmooth, rightPedalSmooth, smO2, tHb, interval);
  this.lastTime = time;
  this.lastDistance = km;
};

proto.decodeEvent = function(def, timeOffset, values) {
  var time = -1,
      event = -1,
      eventType = -1,
      data16 = -1,
      i = 0,
      secs;

  def.fields.forEach(function(field) {
    var value = values[i++];
    if ( value === void 0 ) return;

    if ( field.num === 253 ) { time = value + defaultTime.valueOf(); }
    else if ( field.num === 0 ) { event = value; }
    else if ( field.num === 1 ) { eventType = value; }
    else if ( field.num === 2 ) { data16 = value; }
  }, this);

  if ( event === 0 ) {
    if ( eventType === 0 ) { this.stopped = false; }
    else if ( [1,4,8,9].indexOf(eventType) > -1 ) { this.stopped = true; }
    else if ( [2,3,5,6,7].indexOf(eventType) === -1 ) { this.errors.errors.push('Unknown timer event type ' + eventType); }
  } else if ( event === 36 ) {
    secs = this.startTime === 0 ? 0 : time - this.startTime;
    if ( eventType === 3 ) {
      ++this.calibration;
      this.rideFile.addCalibration(secs, data16, 'Calibration ' + this.calibration + ' (' + data16 + ')');
    } else {
      this.errors.errors.push('Unknown calibration event type ' + eventType);
    }
  }

  this.lastEvent = event;
  this.lastEventType = eventType;
};

proto.readRecord = function(stop, errors) {
  var count = { count: 0 },
      headerByte = this.readUInt8(count),
      i = 0,
      localMsgType,
      def,
      reserved,
      numFields,
      field,
      baseType,
      timeOffset,
      values,
      globalMsgNum;
  stop.stop = false;
  if ( !( headerByte & 0x80 ) && ( headerByte & 0x40 ) ) {
    localMsgType = headerByte & 0xf;

    def = new FitDefinition();
    this.localMsgTypes[localMsgType] = def;

    reserved = this.readUInt8(count);
    def.isBigEndian = this.readUInt8(count);
    def.globalMsgNum = this.readUInt16(def.isBigEndian, count);
    numFields = this.readUInt8(count);

    for ( ; i < numFields; ++i ) {
      field = new FitField();
      field.num = this.readUInt8(count);
      field.size = this.readUInt8(count);
      baseType = this.readUInt8(count);
      field.type = baseType & 0x1f;
      def.fields.push(field);
    }
  } else {
    timeOffset = 0;
    if ( headerByte & 0x80 ) {
      localMsgType = ( headerByte >> 5 ) & 0x3;
      timeOffset = headerByte & 0x1f;
    } else {
      localMsgType = headerByte & 0xf;
    }
    def = this.localMsgTypes[localMsgType];
    if ( ! def ) {
      errors.errors.push('local type ' + localMsgType + ' without previous definition');
      stop.stop = true;
      return count;
    }
    values = [];
    def.fields.forEach(function(field) {
      var v,
          size;
      if ( field.type < 3 ) {
        v = this.readUInt8(count);
        size = 1;
      } else if ( field.type < 5 ) {
        v = this.readUInt16(def.isBigEndian, count);
        size = 2;
      } else if ( field.type < 7 ) {
        v = this.readUInt32(def.isBigEndian, count);
        size = 4;
      } else if ( field.type === 10 ) {
        v = this.readUInt8z(count);
        size = 1;
      } else if ( field.type === 11 ) {
        v = this.readUInt16z(def.isBigEndian, count);
        size = 2;
      } else if ( field.type === 12 ) {
        v = this.readUInt32z(def.isBigEndian, count);
        size = 4;
      } else {
        this.readUnknown(field.size, count);
        v = void 0;
        this.unknownBaseType.push(field.num);
        size = field.size;
      }
      if ( size < field.size ) {
        this.readUnknown(field.size - size, count);
      }
      values.push(v);
    }, this);
    globalMsgNum = def.globalMsgNum;
    if ( globalMsgNum === 0 ) { this.decodeFileId(def, timeOffset, values); }
    else if ( globalMsgNum === 18 ) { /* this.decodeSession(def, timeOffset, values); */ }
    else if ( globalMsgNum === 19 ) { this.decodeLap(def, timeOffset, values); }
    else if ( globalMsgNum === RECORD_TYPE ) { this.decodeRecord(def, timeOffset, values); }
    else if ( globalMsgNum === 21 ) { this.decodeEvent(def, timeOffset, values); }
    else if ( globalMsgNum === 22 ) { /* undocumented */ }
    else if ( globalMsgNum === 23 ) { /* this.decodeDeviceInfo(def, timeOffset, values); */ }
    else if ( globalMsgNum === 34 ) { /* activity */ }
    else if ( globalMsgNum === 49 ) { /* file creator */ }
    else if ( globalMsgNum === 72 ) { /* undocumented - new for garmin 800 */ }
    else if ( globalMsgNum === 79 ) { /* undocumented */ }
    else {
      this.unknownGlobalMsgNums.push(globalMsgNum);
    }
    this.lastMsgNum = globalMsgNum;
  }

  return count.count;
};

proto.close = function() {
  fs.close(this.fd, (function() {
    if ( this.errors.errors.length ) {
      this.emit('errors', this.errors.errors);
    }
  }).bind(this));
};




proto.run = function() {
  var dataSize = 0,
      headerSize,
      protocolVersion,
      profileVersion,
      fitStr,
      bytesRead,
      stop,
      truncated,
      crc;

  this.rideFile = RideFile()
    .deviceType("Garmin FIT")
    .recIntSecs(1.0);
  try {
    headerSize = this.readUInt8();
    if ( headerSize !== 12 && headerSize !== 14 ) {
      this.errors.errors.push('bad header size: ' + headerSize);
      this.close();
      return null;
    }
    protocolVersion = this.readUInt8();
    profileVersion = this.readUInt16(false);
    dataSize = this.readUInt32(false);
    fitStr = new Buffer(4);
    if ( fs.readSync(this.fd, fitStr, 0, 4) !== 4 ) {
      this.errors.errors.push('truncated header');
      this.close();
      return null;
    }
    if ( fitStr.toString().localeCompare('.FIT') !== 0 ) {
      this.errors.errors.push('bad header, expected ".FIT" but got "' + fitStr + '"');
      this.close();
      return null;
    }
    if ( headerSize === 14 ) this.readUInt16(false);
  } catch ( e ) {
    this.errors.errors.push('truncated file body');
    return null;
  }

  bytesRead = 0;
  stop = { stop: false };
  truncated = false;

  try {
    while ( ! stop.stop && bytesRead < dataSize ) {
      bytesRead += this.readRecord(stop, this.errors);
    }
  } catch ( e ) {
    this.errors.errors.push('truncated file body');
    truncated = true;
  }

  if ( stop.stop ) {
    this.close();
    return null;
  }

  if ( ! truncated ) {
    crc = this.readUInt16(false);
  }

  this.unknownGlobalMsgNums.forEach(function(num) {
    log('FitFile: unknown global message number ' + num + ': ignoring it');
  });
  this.unknownRecordFields.forEach(function(num) {
    log('FitFile: unknown record field ' + num + ': ignoring it');
  });
  this.unknownBaseType.forEach(function(num) {
    log('FitFile: unknown base type ' + num + '; skipped');
  });

  this.close();
  return this.rideFile;
};


exports.fitFileReader = function FitFileReader(file, errors) {
  var state = new FitState(file, errors);
  return state.run();
};
