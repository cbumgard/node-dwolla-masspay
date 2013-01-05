var config = require('./config')
  , masspay = require('../lib/dwolla-masspay')(config)
  , should = require('should');

describe('dwolla-masspay', function() {
  describe('#job_details_by_id()', function() {
    it('Should find the status details for a newly created job', function(done) {

      this.timeout(20000); // 20s timeout to account for latency against live server

      var user_job_id = 'mocha-test-' + new Date().getTime()
        , source = 'balance'
        , assumeCosts = true
        , test = true
        , email = 'admin@domain.com'
        , filedata = [
          { destination: 'bob@domain.com', amount: 0.01},
          { destination: 'alice@domain.com', amount: 5}
        ];

      console.info('Calling dwolla-masspay#create_job()');
      masspay.create_job(email, filedata, assumeCosts, test, source, user_job_id, function(err, res) {
        if (err) { throw err; } 
        else {
          should.exist(res);
          res.should.have.property('success').and.be.true;
          res.should.have.property('job');
          res.job.should.have.property('job_id');
          res.job.should.have.property('uid');
          res.job.should.have.property('total').and.equal(5.01);
          res.job.should.have.property('fees').and.equal(0);
          res.job.should.have.property('source').and.equal('balance');
          res.job.should.have.property('rows').and.equal(2);
          res.job.should.have.property('email').and.equal(email);
          res.job.should.have.property('assumeCosts').and.equal('true');
          res.job.should.have.property('status').and.equal('Pending');
          var job_id = res.job.job_id;
          masspay.monitor_status(config.monitor_interval_ms, 
            config.monitor_timeout_ms, job_id, user_job_id, function(err, res) {
            should.exist(err); // in test mode, mass pay jobs never finish so timeout is expected
            done();
          });
        }        
      });  

    });  
  })
});