class MySQLClient:
    def __init__(self, dsn: str) -> None:
        self.dsn = dsn

    def connect(self) -> None:
        raise NotImplementedError("Add your MySQL implementation here.")
