CREATE TABLE `firmographic_group_master` (
  `firmographic_group_id` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `firmoMasterUuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`firmographic_group_id`,`firmoMasterUuid`),
  KEY `firmographic_group_id_idx` (`firmographic_group_id`),
  KEY `firmo_master_uuid_idx` (`firmoMasterUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
