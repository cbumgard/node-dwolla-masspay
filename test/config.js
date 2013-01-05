module.exports = {
  token: process.env.DWOLLA_OAUTH_TOKEN || null, 
  pin: process.env.DWOLLA_PIN || null,
  uid: process.env.DWOLLA_UID || null,
  monitor_interval_ms: 500, // how often to poll the job details endpoint
  monitor_timeout_ms: 2000  // when to timeout, or 0 = never time out
}