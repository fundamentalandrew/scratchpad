CREATE TABLE `client_flow_monthly` (
  `client_flow_id` int(10) unsigned NOT NULL,
  `month` date NOT NULL,
  `value` decimal(15,5) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`client_flow_id`,`month`),
  KEY `value` (`value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
