const jwt = require("jsonwebtoken");
require("dotenv").config();
 
exports.createToken = function(fn, ln, id) {
    return _createToken(fn, ln, id);
}
 
const _createToken = function(fn, ln, id) {
    let ret;
    try {
        const user = { userId: id, firstName: fn, lastName: ln };
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' });
        ret = { accessToken: accessToken };
    } catch(e) {
        ret = { error: e.message };
    }
    return ret;
}
 
exports.isExpired = function(token) {
    try {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        return false;
    } catch(e) {
        return true;
    }
}
 
exports.refresh = function(token) {
    const ud = jwt.decode(token, { complete: true });
    const userId = ud.payload.userId;
    const firstName = ud.payload.firstName;
    const lastName = ud.payload.lastName;
    return _createToken(firstName, lastName, userId);
}