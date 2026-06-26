CREATE TABLE `shared_document` (
  `sharedDocumentId` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `storageLocation` varchar(500) COLLATE utf8_unicode_ci NOT NULL,
  `clientOfficeId` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `clientUuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `recipientType` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `documentType` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `version` decimal(15,4) NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `uploadedUserId` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`sharedDocumentId`),
  KEY `clientOfficeIdIdx` (`clientOfficeId`),
  KEY `clientUuidIdx` (`clientUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
