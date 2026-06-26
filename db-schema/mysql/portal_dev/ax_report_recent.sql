CREATE TABLE `ax_report_recent` (
  `reportRef` varchar(50) NOT NULL,
  `mostRecent` date NOT NULL,
  PRIMARY KEY (`reportRef`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
