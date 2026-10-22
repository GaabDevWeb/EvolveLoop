from alpha.core import AlphaGateway


def run_beta() -> str:
    return AlphaGateway().ping()
