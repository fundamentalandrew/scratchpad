CREATE TABLE `dictionary_channel` (
  `channelKey` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `channelValue` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `paid` tinyint(4) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`channelKey`),
  KEY `channelValue` (`channelValue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
