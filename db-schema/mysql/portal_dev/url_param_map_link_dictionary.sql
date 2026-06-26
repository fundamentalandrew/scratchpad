CREATE TABLE `url_param_map_link_dictionary` (
  `clientUuid` varchar(50) NOT NULL,
  `domain` varchar(255) NOT NULL,
  `dimension` varchar(255) NOT NULL,
  `displayKey` varchar(100) NOT NULL,
  PRIMARY KEY (`clientUuid`,`domain`,`dimension`,`displayKey`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
