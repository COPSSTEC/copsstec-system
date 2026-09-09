class LogMemberNotifier:
    def notify_credentials(self, email: str, password: str, full_name: str) -> None:
        print(
            "MEMBER_CREDENTIALS",
            {
                "to": email,
                "full_name": full_name,
                "password": password,
            },
        )
