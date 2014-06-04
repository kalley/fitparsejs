var Transform = require('stream').Transform;
var util = require('util');
var CRC = require('./crc');

util.inherits(FitFileDecoder, Transform);

var FIT_PROTOCOL_VERSION_MAJOR = 1;
var FIT_PROTOCOL_VERSION_MINOR = 0;
var FIT_PROTOCOL_VERSION_MAJOR_SHIFT = 4;
var FIT_PROTOCOL_VERSION_MAJOR_MASK = 0x0F << FIT_PROTOCOL_VERSION_MAJOR_SHIFT;
var FIT_PROTOCOL_VERSION_MINOR_MASK = 0x0F;
var FIT_PROTOCOL_VERSION = (FIT_PROTOCOL_VERSION_MAJOR << FIT_PROTOCOL_VERSION_MAJOR_SHIFT) | FIT_PROTOCOL_VERSION_MINOR;
var FIT_HDR_TIME_REC_BIT = 0x80;

function FitFileDecoder(options) {
  if ( ! ( this instanceof FitFileDecoder ) ) return new FitFile(options);

  Transform.call(this, options);

  this._rawHeader = [];
  this.header = null;
  this.state = 'HEADER';
  this.bytesRead = 0;
  this.fileBytesLeft = 3; // header + crc
  this.fileHeaderOffset = 0;
  this.fileHeaderSize = 0;
  this.fileDataSize = 0;
  this.crc = 0;
};

FitFileDecoder.prototype._transform = function(chunk, encoding, done) {
  var i = 0;
  var l = chunk.length;
  var data;
  var strData;
  if ( ! this.bytesRead ) {
    for ( ; i < l; ++i ) {
      data = chunk[i];
      strData = String.fromCharCode(data);
      if ( this.fileBytesLeft > 0 ) {
        this.crc = CRC.get16(this.crc, data);
        this.fileBytesLeft--;

        if ( this.fileBytesLeft === 1 ) {
          if ( this.state !== 'RECORD' ) {
            throw new Error("FIT decode error: Decoder not in correct state after last data byte in file. Check message definitions.");
          }
          continue;
        }
        if ( this.fileBytesLeft === 0 ) {
          if ( this.crc !== 0 ) {
            throw new Error("FIT decode error: File CRC failed.");
          }
          this.push(null);
        }
      }
      if ( this.state === 'HEADER' ) {
        this.bytesRead++;
        switch ( this.fileHeaderOffset++ ) {
          case 0:
            this.fileHeaderSize = data;
            this.fileBytesLeft = this.fileHeaderSize + 2;
            break;
          case 1:
            if ( data & FIT_PROTOCOL_VERSION_MAJOR_MASK > FIT_PROTOCOL_VERSION_MAJOR << FIT_PROTOCOL_VERSION_MAJOR_SHIFT ) {
              throw new Error("FIT decode error: Protocol version " + ( (data & FIT_PROTOCOL_VERSION_MAJOR_MASK) << FIT_PROTOCOL_VERSION_MAJOR_SHIFT ) + "." + (data & FIT_PROTOCOL_VERSION_MINOR_MASK) + " not supported.  Must be " + FIT_PROTOCOL_VERSION_MAJOR + ".15 or earlier.");
            }
            break;
          case 4:
            this.fileDataSize = data & 0xFF;
            break;
          case 5:
            this.fileDataSize |= (data & 0xFF) << 8;
            break;
          case 6:
            this.fileDataSize |= (data & 0xFF) << 16;
            break;
          case 7:
            this.fileDataSize |= (data & 0xFF) << 24;
            break;
          case 8:
            strData = String.fromCharCode(data, chunk[++i], chunk[++i], chunk[++i]);
            if ( strData !== '.FIT' ) throw new Error("FIT decode error: File header signature mismatch.  File is not FIT.");
            this.fileHeaderOffset += 3;
            break;
        }
        if ( this.fileHeaderOffset === this.fileHeaderSize ) {
          this.fileBytesLeft = this.fileDataSize + 2; // include crc
          this.state = 'RECORD';
          break;
        }
      } else if ( this.state === 'RECORD' ) {
        this.fieldIndex = 0;
        this.fieldBytesLeft = 0;
        if ( this.fileBytesLeft > 1 ) {
          if ( data & FIT_HDR_TIME_REC_BIT !== 0 ) {
            // TODO: Implement
            this.state = 'FIELD_DATA';
          } else {
            if ( data & FIT_HDR_TYPE_DEF_BIT !== 0 ) {
              this.state = 'RESERVED1';
            } else {
              // TODO: Implement
              this.state = 'FIELD_DATA';
            }
          }
        } else {
          this.state = 'FILE_CRC_HIGH';
        }
      } else if ( this.state === 'RESERVED1' ) {
        this.state = 'ARCH';
      } else if ( this.state === 'ARCH' ) {
        this.state = 'MESG_NUM_0';
      } else if ( this.state === 'MESG_NUM_0' ) {
        this.state = 'MESG_NUM_1';
      } else if ( this.state === 'MESG_NUM_1' ) {
        // TODO: Implement
        this.state = 'NUM_FIELDS';
      } else if ( this.state === 'NUM_FIELDS' ) {
        this.numFields = data;
        if ( this.numFields === 0 ) {
          this.state = 'RECORD';
          // emit
        } else {
          this.state = 'FIELD_NUM';
        }
      } else if ( this.state === 'FIELD_NUM' ) {
        this.state = 'FIELD_SIZE';
      } else if ( this.state === 'FIELD_SIZE' ) {
        this.state = 'FIELD_TYPE';
      } else if ( this.state === 'FIELD_TYPE' ) {
        if ( ++this.fieldIndex >= this.numFields ) {
          this.state = 'RECORD';
        } else {
          this.state = 'FIELD_NUM';
        }
      }
    }
    this.push(chunk.slice(this.bytesRead));
  } else {
    this.push(chunk);
  }
  done();
};



var file = process.argv[process.argv.indexOf('-f') + 1];
var source = require('fs').createReadStream(file);
var parser = new FitFileDecoder();

source.pipe(parser);