# node-dwolla-masspay

Easy node.js integration for Dwolla's MassPay API. 

## Overview

Based on the Dwolla Labs MassPay API which has two endpoints: [Create Job](http://developers.dwolla.com/dev/docs/labs/masspay/create) and [Job Details by ID](http://developers.dwolla.com/dev/docs/labs/masspay/byid). This module provides simple access to the two endpoints above, as well as an additional monitor timer that will poll the [Job Details by ID](http://developers.dwolla.com/dev/docs/labs/masspay/byid) endpoint on a specified interval until the job is complete, or a specified timeout reached.

## Usage
    
    var config = {
      token: process.env.DWOLLA_OAUTH_TOKEN || null, // Required
      pin: process.env.DWOLLA_PIN || null,           // Required
      uid: process.env.DWOLLA_UID || null,           // Required
      monitor_interval_ms: 500, // Optional (default 1000): how often to poll the job details endpoint
      monitor_timeout_ms: 0     // Optional (default 0): when to timeout, or 0 == never time out
    }
    var masspay = require('dwolla-masspay')(config);
    // NOTE: you must define email, filedata, assumeCosts, test, source, user_job_id in your code
    masspay.create_job(email, filedata, assumeCosts, test, source, user_job_id, function(err, res) {
      if (err) { throw err; } 
      else {
        // You could also call masspay.job_details_by_id() here if you wish, but monitor_status()
        // calls it until either the job completes or a timeout has been reached:
        masspay.monitor_status(config.monitor_interval_ms, config.monitor_timeout_ms, job_id, user_job_id, function(err, res) {
          if (err) { throw err; }
          else {
            // Job has completed successfully
          }
        });
      }
    });

### Notes on the config object:

* If you already have a config defined for the 'dwolla' module it should work here by simply adding in the `monitor_*` settings.
* This approach is designed to keep sensitive info externalized from your source code.
* If any of the auth keys are missing from the config object ('token', 'pin', or 'uid'), the dwolla-masspay module will throw an error immediately.
* This module does not require 'client_id' or 'client_secret' (unlike the 'dwolla' module) as they are not needed by the Mass Pay endpoints.

## Testing

Run: `npm test`

This executes a single integration test that covers all three API functions exposed by this module. It creates a Mass Pay job with Dwolla (in test mode), then starts a monitor timer that calls the job details endpoint on Dwolla to check job status until timeout. Mass Pay jobs created on Dwolla in test mode do not complete, so it is expected for this job to timeout. Testing is in Mocha with Should.js.

## Background

Written originally for my company AskYourUsers.com which recently began allowing users to accept payments via [Dwolla](http://blog.dwolla.com/askyourusers/).