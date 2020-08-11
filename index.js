const smartApp   = require('./smartapp')
const request    = require('request');

module.exports.handle = (event, context, callback) => {
    var response = {
        statusCode: 200
    };
    var lifecycle = event.lifecycle;
    if ( lifecycle === "CONFIRMATION" ) {
        var host = context.confirmationData.confirmationUrl;
        curl_call(host, false, false, false, "GET", function(err, res, body) {
            if ( err ) {
                console.log("Error processing confirmation", err);
                response.body = err;
            } else {    
                console.log("Confirmation: ", body);
                response.body = body;
            }
        });
    } else {
        smartApp.handleLambdaCallback(event, context, callback);
        response.body = context;
    }
    return response;
};

function curl_call(host, headertype, nvpstr, formdata, calltype, callback) {
    var opts = {url: host};
    if ( !calltype ) {
        calltype = "GET";
    }
    opts.method = calltype;
    
    if ( nvpstr && typeof nvpstr === "object" ) {
        opts.form = nvpstr;
    } else if ( nvpstr && typeof nvpstr === "string" ) {
        opts.url = host + "?" + nvpstr;
    }
    
    if (formdata) {
        opts.formData = formdata;
    }
    
    if ( headertype ) {
        opts.headers = headertype;
    }
    request(opts, callback);
}
