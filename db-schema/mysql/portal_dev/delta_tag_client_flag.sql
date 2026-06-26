CREATE TABLE `delta_tag_client_flag` (
  `dt_client_uuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `flag` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `value` text COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`dt_client_uuid`,`flag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
