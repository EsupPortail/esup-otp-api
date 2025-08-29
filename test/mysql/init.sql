USE test_otp;

CREATE TABLE User (
  uid VARCHAR(255) PRIMARY KEY,
  mail VARCHAR(255),
  sms VARCHAR(255),
  displayName VARCHAR(255)
);
