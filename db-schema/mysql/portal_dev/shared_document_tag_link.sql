CREATE TABLE `shared_document_tag_link` (
  `sharedDocumentId` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `sharedDocumentTagId` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`sharedDocumentId`,`sharedDocumentTagId`),
  KEY `sharedDocumentIdIdx` (`sharedDocumentId`),
  KEY `sharedDocumentTagIdIdx` (`sharedDocumentTagId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
