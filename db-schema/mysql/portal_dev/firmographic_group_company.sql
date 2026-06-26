CREATE TABLE `firmographic_group_company` (
  `firmographic_group_id` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `companyUuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`firmographic_group_id`,`companyUuid`),
  KEY `firmographic_group_id_idx` (`firmographic_group_id`),
  KEY `company_uuid_idx` (`companyUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
