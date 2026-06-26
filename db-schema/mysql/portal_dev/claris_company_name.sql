CREATE TABLE `claris_company_name` (
  `companyUuid` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `primary` tinyint(1) DEFAULT NULL,
  `optional3rd` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`name`,`companyUuid`) USING BTREE,
  UNIQUE KEY `name` (`name`),
  KEY `claris_company_name_primary` (`primary`),
  KEY `claris_company_name_companyUuid` (`companyUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
