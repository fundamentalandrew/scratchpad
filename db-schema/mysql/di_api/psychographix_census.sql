CREATE TABLE `psychographix_census` (
  `zipcode` char(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `county` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` char(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `household_income_index` decimal(6,3) unsigned DEFAULT NULL,
  `housing_cost_index` decimal(6,3) unsigned DEFAULT NULL,
  `education_index` decimal(6,3) unsigned DEFAULT NULL,
  `idle_cash_index` decimal(6,3) unsigned DEFAULT NULL,
  `total_population` int(10) unsigned DEFAULT NULL,
  `median_age` decimal(4,1) DEFAULT NULL,
  PRIMARY KEY (`zipcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
