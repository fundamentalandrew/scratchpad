CREATE TABLE `url_param_dictionary` (
  `clientUuid` varchar(50) NOT NULL DEFAULT '',
  `domain` varchar(255) NOT NULL DEFAULT '',
  `displayKey` varchar(100) NOT NULL DEFAULT '',
  `paramValue` varchar(255) NOT NULL,
  PRIMARY KEY (`clientUuid`,`displayKey`,`paramValue`,`domain`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
