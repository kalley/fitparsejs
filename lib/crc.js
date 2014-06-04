var CRC = {
  get16: function(crc, byte) {
    var table = [0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401, 0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400];
    var tmp;
    tmp = table[crc & 0xF];
    crc  = (crc >> 4) & 0x0FFF;
    crc  = crc ^ tmp ^ table[byte & 0xF];

    // now compute checksum of upper four bits of byte
    tmp = table[crc & 0xF];
    crc  = (crc >> 4) & 0x0FFF;
    crc  = crc ^ tmp ^ table[(byte >> 4) & 0xF];

    return crc;
  },
  calc16: function(data, size) {
    var crc = 0;
    var data_ptr = data;

    while (size)
    {
      crc = CRC.get16(crc, data_ptr);
      data_ptr++;
      size--;
    }

    return crc;
  }
};

module.exports = CRC;