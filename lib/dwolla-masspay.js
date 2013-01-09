var request = require('request')
  , util = require('util');

/*****************************************************************************
 * Dwolla API Integration Module (MassPay only currently)
 *----------------------------------------------------------------------------
 * Requires the following configuration param:
 * @param config {Object} (Required) Expects form of: {
 *    'token': {String} never expiring oauth2 account token
 *      'pin': {Number} 4-digit account PIN
 *      'uid': {String} account UID / Dwolla ID (i.e. '123-456-7890')
 * }
 * @param logger {Object} (Optional) Logger that supports standard log level 
 *                        functions, i.e. logger.info(), logger.warn(), 
 *                        and logger.error(). If not specified defaults to
 *                        console.
 * Note: you can generate a token at http://developers.dwolla.com/dev/token
 *****************************************************************************/
module.exports = function(config, logger) {
  if (!logger) {
    logger = console; // default to console out; supports other transports such as winston
  }
  // Define API endpoints:
  var endpoints = {
    create_job: 'https://masspay.dwollalabs.com/api/create',
    job_details_by_id: 'https://masspay.dwollalabs.com/api/status'
  };  
  // Validate our required config options are set:
  if (!config) { throw new Error('dwolla module requires "config" object'); }
  if (!config.token) { throw new Error('dwolla config requires "token" key'); }
  if (!config.pin) { throw new Error('dwolla config requires "pin" key'); }
  if (!config.uid) { throw new Error('dwolla config requires "uid" key'); }

  /****************************************************************************
   * create_job: create a mass payment job to one or more recipients.
   *---------------------------------------------------------------------------
   * See http://developers.dwolla.com/dev/docs/labs/masspay/create
   * @param email        {String}       email address to send reports to.
   * @param filedata     {Object/Array} object or array of objects containing
   *                                    payment info. Each object should 
   *                                    contain a destination {String} email 
   *                                    for the recipient and amount {Number} 
   *                                    of US Dollars to pay.
   * @param assumeCosts  {Boolean}      (Optional - default: true) If true, 
   *                                    you assume the costs.
   *                                    If false, the recipients assumes the 
   *                                    costs. Use null for default.
   * @param test         {Boolean}      (Optional - default: true) False for 
   *                                    live payments, true for test 
   *                                    payments. Use null for default.
   * @param source       {String }      (Optional - default: 'balance') Desired 
   *                                    funding source from which to send money. 
   *                                    Use null for default.
   * @param user_job_id  {String}       (Optional - default: none) A user assigned 
   *                                    job ID for the MassPay job. Use null for 
   *                                    default.   
   * @param callback     {Function}     passed (err, res) - err is null  
   *                                    if no error, and res contains response 
   *                                    data as JSON object.
   ***************************************************************************/ 
  var create_job = function(email, filedata, assumeCosts, test, source, user_job_id, callback) {
    logger.info( util.format('dwolla-masspay#create_job(): %d payments; notifying <%s>; test: %s; user_job_id: %s', 
      filedata.length, email, test, user_job_id) );
    var create_req = {
      token: config.token,
      pin: config.pin,
      email: email,
      filedata: filedata,
      assumeCosts: assumeCosts !== null ? assumeCosts : true,
      test: test !== null ? test : true,
      source: source !== null ? source : 'balance'
    };
    if (user_job_id !== null) {
      create_req.user_job_id = user_job_id;
    }
    request.post({
      uri: endpoints.create_job,
      strictSSL: true,
      json: create_req
    }, function(err, res, body) {
      if (err) {
        callback(err, null);
      } else if (body.status === false) {
        callback(body.message, null); // body.message contains error message in this case
      } else {
        callback(null, body); // body contains the results, i.e. {'success': true, 'job': {..}}
      }      
    });
  }

  /****************************************************************************
   * job_details_by_id: check the status of a create_job() job.
   * Either job_id or user_job_id must be set.
   *---------------------------------------------------------------------------
   * See http://developers.dwolla.com/dev/docs/labs/masspay/byid
   * @param job_id      {String}   job_id returned by create_job()
   * @param user_job_id {String}   (Optional - default: none) A user assigned 
   *                               job ID for the MassPay job. Use null for 
   *                               default.   
   * @param callback    {Function} passed (err, res) - err is null  
   *                               if no error, and res contains response 
   *                               data as JSON object.
   ***************************************************************************/
  var job_details_by_id = function(job_id, user_job_id, callback) {
    logger.info( util.format('dwolla-masspay#job_details_by_id(): job_id: %s; user_job_id: %s', 
      job_id, user_job_id) );
    var status_req = {
      uid: config.uid
    };
    if (user_job_id !== null) {
      status_req.user_job_id = user_job_id;
    } else {
      status_req.job_id = job_id;
    }
    request.post({
      uri: endpoints.job_details_by_id,
      strictSSL: true,
      json: status_req
    }, function(err, res, body) {
      if (err) {
        callback(err, null);
      } else if (body.status === false) {
        callback(body.message, null); // body.message contains error message in this case
      } else {
        callback(null, body); // body contains the results, i.e. {'success': true, 'job': {..}}
      }      
    });
  }

  /****************************************************************************
   * monitor_status: monitor the status of a create_job() job
   *                 on a timer that checks job_details_by_id() on
   *                 a specified interval with optional timeout.
   *---------------------------------------------------------------------------
   * See http://developers.dwolla.com/dev/docs/labs/masspay/byid
   * @param interval_ms  {Number}   Checks the job status continually after
   *                                the specified number of millis.
   * @param timeout_ms   {Number}   Cancels the timer after specified number
   *                                of millis. If <= 0 will never cancel.
   * @param job_id       {String}   job_id returned by create_job()
   * @param user_job_id  {String}   (Optional - default: none) A user assigned 
   *                                job ID for the MassPay job. Use null for 
   *                                default.   
   * @param callback     {Function} passed (err, res) - err is null  
   *                                if no error, and res contains response 
   *                                data as JSON object. Invoked if 
   *                                job_details_by_id() sends an error,
   *                                completes successfully, or times out.
   ***************************************************************************/
  var monitor_status = function(interval_ms, timeout_ms, job_id, user_job_id, callback) {
    logger.info( util.format('[monitor_mass_pay_job] job_id: %s; user_job_id: %s; interval_ms: %d; timeout_ms: %d', 
      job_id, user_job_id, interval_ms, timeout_ms) );    
    if (interval_ms <= 0) { interval_ms = 1000; }
    if (!timeout_ms || timeout_ms === NaN) { timeout_ms = 0; }
    var interval_id = setInterval(function() {
      job_details_by_id(job_id, user_job_id, function(err, res) {
        if (err) {
          logger.error( util.format('[monitor_mass_pay_job] dwolla mass pay (job_id: %s; user_job_id: %s) err: "%s"', 
            job_id, user_job_id, err) );
          clearInterval(interval_id);
          callback(err, null);
        } else if (res && res.job && res.job.status && res.job.status.toLowerCase() === 'completed') {
          logger.info( util.format('[monitor_mass_pay_job] dwolla mass pay job completed (job_id: %s; user_job_id: %s)', 
            job_id, user_job_id) );
          clearInterval(interval_id);
          callback(null, res);
        } else {
          logger.info( util.format('[monitor_mass_pay_job] dwolla mass pay job pending (job_id: %s; user_job_id: %s)', 
            job_id, user_job_id) );
        }
      });
    }, interval_ms);
    if (timeout_ms > 0) {
      setTimeout(function() {
        logger.warn( util.format('[monitor_mass_pay_job] timeout dwolla mass pay (job_id: %s, user_job_id: %s)', 
          job_id, user_job_id) );
        clearInterval(interval_id);
        callback(new Error(util.format('timeout dwolla mass pay (job_id: %s; user_job_id: %s)', 
          job_id, user_job_id)), null);
      }, timeout_ms);
    }
  }

  return {
    create_job: create_job,
    job_details_by_id: job_details_by_id,
    monitor_status: monitor_status
  }
}