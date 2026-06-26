CREATE TABLE `subscription_agreement_document` (
  `uuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `agreementUuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `version` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `storageLocation` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`uuid`),
  KEY `version` (`version`),
  KEY `name` (`name`),
  KEY `agreementUuid` (`agreementUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
